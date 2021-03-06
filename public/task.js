let mod = {};
module.exports = mod;
mod.tasks = [];
mod.executeCache = {};
mod.populate = function () {
	global.Task.addTasks(...[
		global.Task.attackController,
		global.Task.claim,
		global.Task.defense,
		global.Task.guard,
		global.Task.labTech,
		global.Task.mining,
		global.Task.pioneer,
		global.Task.reputation,
		global.Task.reserve,
		global.Task.robbing,
		global.Task.safeGen,
		global.Task.scheduler,
	]);
};
mod.addTasks = (...task) => global.Task.tasks.push(...task);
mod.installTask = (...taskNames) => {
	taskNames.forEach(taskName => {
		global.Task[taskName] = load(`task.${taskName}`);
		global.Task.addTasks(global.Task[taskName]);
	});
};
// load task memory & flush caches
mod.flush = function () {
	global.Task.tasks.forEach(task => {
		if (task.flush)
			task.flush();
	});
};
// temporary hack to avoid registering twice internally, remove and fix internal when merged.
mod.selfRegister = true;
// register tasks (hook up into events)
mod.register = function () {
	global.Task.tasks.forEach(task => {
		// Extending of any other kind
		if (task.register)
			task.register();
		// Flag Events
		if (task.execute && !global.Task.executeCache[task.name])
			global.Task.executeCache[task.name] = {execute: task.execute};
		if (task.handleFlagFound)
			Flag.found.on(flag => task.handleFlagFound(flag));
		if (task.handleFlagRemoved)
			Flag.FlagRemoved.on(flagName => task.handleFlagRemoved(flagName));
		// Creep Events
		if (task.handleSpawningStarted)
			Creep.spawningStarted.on(params => task.handleSpawningStarted(params));
		if (task.handleSpawningCompleted)
			Creep.spawningCompleted.on(creep => task.handleSpawningCompleted(creep));
		if (task.handleCreepDied) {
			Creep.predictedRenewal.on(creep => task.handleCreepDied(creep.name));
			Creep.died.on(name => task.handleCreepDied(name));
		}
		// TODO there is no task.handleCreepError in tasks
		if (task.handleCreepError)
			Creep.error.on(errorData => task.handleCreepError(errorData));
		// Room events
		if (task.handleNewInvader)
			Room.newInvader.on(invader => task.handleNewInvader(invader));
		// TODO there is no task.handleKnownInvader in tasks
		if (task.handleKnownInvader)
			Room.knownInvader.on(invaderID => task.handleKnownInvader(invaderID));
		if (task.handleGoneInvader)
			Room.goneInvader.on(invaderID => task.handleGoneInvader(invaderID));
		if (task.handleRoomDied)
			Room.collapsed.on(room => task.handleRoomDied(room));
		if (task.nuked)
			Room.nuked.on(room => task.nuked(room));
	});
};
mod.execute = function () {
	_.forEach(global.Task.executeCache, function (n, k) {
		try {
			n.execute();
		} catch (e) {
			console.log(`Error executing Task "${k}"<br>${e.stack || e.toString()}`);
		}
	});
};
mod.memory = (task, s) => { // task:  (string) name of the task, s: (string) any selector for that task, could be room name, flag name, enemy name
	// const memory =
	// temporary migration, remove if in dev
	// delete memory.queuedValid;
	// delete memory.runningValid;
	// delete memory.spawningValid;
	return global.Util.get(Memory, ['tasks', task, s], {});
};
mod.cleanup = function (subKeys, task, s) {
	mod.removeQueued(mod.memory(task, s), subKeys);
	mod.clearMemory(task, s);
};
mod.removeQueued = function (memory, subKeys) {
	const removeEntries = mem => {
		if (_.isUndefined(mem)) return;

		for (const entry of mem) {
			const room = Game.rooms[entry.room];
			for (const priority of ['spawnQueueLow', 'spawnQueueMedium', 'spawnQueueHigh']) {
				const queue = room[priority];
				const index = _.findIndex(queue, {name: entry.name});
				if (index >= 0) {
					queue.splice(index, 1);
					break;
				}
			}
		}
	};
	if (subKeys) {
		for (const subKey of subKeys) {
			removeEntries(memory[subKey]);
		}
	} else {
		removeEntries(memory);
	}
};
mod.clearMemory = (task, s) => {
	if (Memory.tasks[task] && Memory.tasks[task][s])
		delete Memory.tasks[task][s];
};
mod.cache = (task, s) => {
	if (!cache[task]) cache[task] = {};
	if (!cache[task][s]) cache[task][s] = {};
	return cache[task][s];
};
mod.clearCache = (task, s) => {
	if (cache[task] && cache[task][s])
		delete cache[task][s];
};
// creepDefinition: { queue, name, behaviour, fixedBody, multiBody }
// destiny: { task, targetName }
// roomParams: { targetRoom, minRCL = 0, maxRange = Infinity, minEnergyAvailable = 0, minEnergyCapacity = 0, callBack = null, allowTargetRoom = false, rangeRclRatio = 3, rangeQueueRatio = 51 }
mod.spawn = (creepDefinition, destiny, roomParams, onQueued) => {
	// get nearest room
	let room = roomParams.explicit ? Game.rooms[roomParams.explicit] : Room.findSpawnRoom(roomParams);
	if (!room)
		return null;
	// define new creep
	if (!destiny)
		destiny = {};
	if (!destiny.room && roomParams.targetRoom)
		destiny.room = roomParams.targetRoom;

	let parts = Creep.compileBody(room, creepDefinition);

	let name = `${creepDefinition.name || creepDefinition.behaviour}-${destiny.targetName}`;
	let creepSetup = {
		parts: parts,
		name: name,
		behaviour: creepDefinition.behaviour,
		destiny: destiny,
		queueRoom: room.name,
	};
	if (creepSetup.parts.length === 0) {
		// creep has no body.
		global.logSystem(flag.pos.roomName, dye(CRAYON.error, `${destiny.task} task tried to queue a zero parts body ${creepDefinition.behaviour} creep. Aborted.`));
		return null;
	}
	// queue creep for spawning
	let queue = room['spawnQueue' + creepDefinition.queue] || room.spawnQueueLow;
	queue.push(creepSetup);
	// save queued creep to task memory
	if (onQueued)
		onQueued(creepSetup);
	return creepSetup;
};
mod.addToQueue = (creepDef, roomParams, target) => {
	if (roomParams.link)
		roomParams = {targetRoom: roomParams};
	if (!roomParams.targetRoom)
		return;
	const destiny = {};
	if (target) {
		destiny.targetName = target.name || target.id;
	} else {
		destiny.targetName = roomParams.targetRoom;
	}
	return global.Task.spawn(creepDef, destiny, roomParams);
};
mod.forceSpawn = (creepDef, roomParams, target) => {
	if (roomParams.link)
		roomParams = {targetRoom: roomParams};
	if (!roomParams.targetRoom)
		return;
	const room = roomParams.explicit ? Game.rooms[roomParams.explicit] : Room.findSpawnRoom(roomParams);
	if (!room)
		return;

	const destiny = {};
	if (target) {
		destiny.targetName = target.name || target.id;
	} else {
		destiny.targetName = roomParams.targetRoom;
	}

	const parts = Creep.compileBody(room, creepDef);
	if (!parts.length)
		return;
	const name = `${creepDef.name || creepDef.behaviour}-${destiny.targetName}`;
	const creepSetup = {
		parts, destiny, name,
		behaviour: creepDef.behaviour,
		queueRoom: room.name,
	};
	const queue = room.spawnQueueHigh;
	queue.unshift(creepSetup);
	return creepSetup;
};
mod.validateQueued = function (memory, flag, task, options = {}) {
	const subKey = options.subKey ? 'queued.' + options.subKey : 'queued';
	const checkPath = options.subKey ? 'nextQueuedCheck.' + options.subKey : 'nextQueuedCheck';
	const queued = global.Util.get(memory, subKey, []);
	let nextCheck = _.get(memory, checkPath, 0);
	// if checkPathValid = true, it will only revalidate if 50 ticks have passed since the last validation
	if (queued.length && (!options.checkValid || Game.time > nextCheck)) {
		const queues = options.queues || ['Low'];
		const validated = [];
		const _validateQueued = entry => {
			if (!entry)
				return;
			const room = Game.rooms[entry.room];
			for (const queue of queues) {
				if (room['spawnQueue' + queue].some(c => c.name === entry.name)) {
					validated.push(entry);
					break;
				}
			}
		};
		queued.forEach(_validateQueued);
		_.set(memory, subKey, validated);
		nextCheck = Game.time + 50;
		global.Util.set(memory, checkPath, nextCheck, false); // set the queued check
	} else if (queued.length === 0) {
		if (options.subKey && memory.nextQueuedCheck)
			delete memory.nextQueuedCheck[options.subKey];
		else delete memory.nextQueuedCheck;
	}
	const oldCheck = _.get(flag.memory, ['nextCheck', task], Infinity);
	if (flag && (nextCheck - Game.time) > 0 && nextCheck < oldCheck) {
		//console.log('queued', flag.name, task, oldCheck, oldCheck - Game.time, nextCheck, nextCheck - Game.time);
		_.set(flag.memory, ['nextCheck', task], nextCheck);
	}
};
mod.validateSpawning = function (memory, flag, task, options = {}) {
	const subKey = options.subKey ? 'spawning.' + options.subKey : 'spawning';
	const checkPath = options.subKey ? 'nextSpawnCheck.' + options.subKey : 'nextSpawnCheck';
	const spawning = Util.get(memory, subKey, []);
	let nextCheck = _.get(memory, checkPath, 0);
	if (spawning.length && (!options.checkValid || Game.time > nextCheck)) {
		const validated = [];
		let minRemaining;
		const _validateSpawning = entry => {
			if (!entry)
				return;
			const spawn = Game.spawns[entry.spawn];
			if (spawn && ((spawn.spawning && spawn.spawning.name === entry.name) || (spawn.newSpawn && spawn.newSpawn.name === entry.name))) {
				minRemaining = (!minRemaining || spawn.spawning.remainingTime < minRemaining) ? spawn.spawning.remainingTime : minRemaining;
				validated.push(entry);
			}
		};
		spawning.forEach(_validateSpawning);
		_.set(memory, subKey, validated);
		if (minRemaining) {
			nextCheck = Game.time + minRemaining;
			global.Util.set(memory, checkPath, nextCheck, false); // set the spawning check
		} else {
			if (options.subKey && memory.nextSpawnCheck)
				delete memory.nextSpawnCheck[options.subKey];
			else
				delete memory.nextSpawnCheck;
		}
	}
	const oldCheck = _.get(flag.memory, ['nextCheck', task], Infinity);
	if (flag && (nextCheck - Game.time) > 0 && nextCheck < oldCheck) {
		//console.log('spawning', flag.name, task, oldCheck, oldCheck - Game.time, nextCheck, nextCheck - Game.time);
		_.set(flag.memory, ['nextCheck', task], nextCheck);
	}
};
mod.predictedRenewal = (creep, roomName) => {

	if (_.isUndefined(roomName))
		roomName = creep.room.name;

	// TODO: better distance calculation
	if (!creep.data.predictedRenewal) {
		if (creep.data.spawningTime)
			creep.data.predictedRenewal = creep.data.spawningTime + (global.Util.routeRange(creep.data.homeRoom, roomName) * 50);
		else
			creep.data.predictedRenewal = (global.Util.routeRange(creep.data.homeRoom, roomName) + 1) * 50;
	}
};
mod.validateRunning = function (memory, flag, task, options = {}) {
	const subKey = options.subKey ? 'running.' + options.subKey : 'running';
	const checkPath = options.subKey ? 'nextRunningCheck.' + options.subKey : 'nextRunningCheck';
	const running = global.Util.get(memory, subKey, []);
	const roomName = options.roomName;

	let nextCheck = _.get(memory, checkPath, 0);

	if (roomName && running.length && (!options.checkValid || Game.time > nextCheck)) {

		const deadCreep = options.deadCreep || '';
		const validated = [];
		let minRemaining;

		const _validateRunning = entry => {
			if (!entry)
				return;
			const name = entry.name || entry;
			// invalidate dead or old creeps for predicted spawning
			const creep = Game.creeps[name];
			// invalidate old creeps for predicted spawning
			if (!creep || !creep.data)
				return;

			mod.predictedRenewal(creep, roomName);

			let prediction = creep.data.predictedRenewal;


			if (creep.name !== deadCreep) {

				// if (creep.data.creepType === 'hauler' || creep.data.creepType === 'worker' || creep.data.creepType === 'remoteHauler') {
				// 	if (Creep.Behaviour.assignAction(creep, 'renewing'))
				// 		return true;
				// }

				if (creep.ticksToLive > prediction) {
					const untilRenewal = creep.ticksToLive - prediction;
					minRemaining = (!minRemaining || untilRenewal < minRemaining) ? untilRenewal : minRemaining;
					validated.push(entry);
				}
			}



		};
		running.forEach(_validateRunning);
		_.set(memory, subKey, validated);
		if (minRemaining) {
			nextCheck = Game.time + Math.min(global.TASK_CREEP_CHECK_INTERVAL, minRemaining); // check running at least every TASK_CREEP_CHECK_INTERVAL ticks
			global.Util.set(memory, checkPath, nextCheck, false);
		} else {
			if (options.subKey && memory.nextRunningCheck)
				delete memory.nextRunningCheck[options.subKey];
			else
				delete memory.nextRunningCheck;
		}
	}
	const oldCheck = _.get(flag.memory, ['nextCheck', task], Infinity);
	if (flag && (nextCheck - Game.time) > 0 && nextCheck < oldCheck) {
		//console.log('running', flag.name, task, oldCheck, oldCheck - Game.time, nextCheck, nextCheck - Game.time);
		_.set(flag.memory, ['nextCheck', task], nextCheck);
	}
};
mod.validateAll = function (memory, flag, task, options = {}) {
	if (_.isUndefined(options.roomName))
		return global.logError('Task.validateAll', 'roomName undefined' + flag + options.subKey);
	mod.validateQueued(memory, flag, task, options);
	mod.validateSpawning(memory, flag, task, options);
	mod.validateRunning(memory, flag, task, options);
};
mod.forceCreepCheck = function (flag, task) {
	if (flag && task)
		_.set(flag.memory, ['nextCheck', task], Game.time);
};
mod.nextCreepCheck = function (flag, task) {
	const nextCheck = _.get(flag.memory, ['nextCheck', task]);
	if (nextCheck && Game.time < nextCheck) {
		return false;
	} else {
		// set default, we will get a better nextCheck if it exists because we return true
		_.set(flag.memory, ['nextCheck', task], Game.time + global.TASK_CREEP_CHECK_INTERVAL);
		return true;
	}
};
mod.reCycleOrIdle = function (creep) {
	global.logSystem(creep.room.name, `${creep.name} has no action => recycle/idle`);
	let mother = Room.closestSpawnRoomFor(creep.room.name).structures.spawns[0];
	if (mother) {
		global.logSystem(creep.room.name, `${creep.name} is recycling`);
		Creep.action.recycling.assign(creep, mother);
	} else {
		global.logSystem(creep.room.name, `${creep.name} is idle`);
		return this.assignAction(creep, 'idle');
	}
}
const cache = {};
