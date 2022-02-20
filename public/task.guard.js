// This task will react on yellow/yellow flags, sending a guarding creep to the flags position.
let mod = {};
module.exports = mod;
mod.name = 'guard';
mod.minControllerLevel = 2;
// hook into events
mod.register = () => {
};
// for each flag
mod.handleFlagFound = flag => {
	// if it is a yellow/yellow or red/red flag
	if ((flag.compareTo(global.FLAG_COLOR.defense) || flag.compareTo(global.FLAG_COLOR.defense.boosted) || flag.compareTo(global.FLAG_COLOR.invade)) && global.Task.nextCreepCheck(flag, mod.name)) {
		global.Util.set(flag.memory, 'task', mod.name);

		// TODO it is temporary
		// if (flag.memory.nextCheck.undefined)
		// 	delete flag.memory.nextCheck.undefined

		let roomName = flag.room ? flag.room.name : flag.memory.roomName;
		let nextCheck = flag.memory.nextCheck.guard - Game.time;
		let runningCheck = (flag.memory.tasks.guard.nextRunningCheck - Game.time) || 0;
		global.logSystem(roomName, `GUARD FLAG FOUND: ${global.json(flag.memory)} nextCheck: ${nextCheck} nextRunningCheck: ${runningCheck}`);
		// check if a new creep has to be spawned
		global.Task.guard.checkForRequiredCreeps(flag);
	}
};
mod.creep = {
	guard: {
		fixedBody: [
			ATTACK,
			MOVE,
		],
		multiBody: [
			TOUGH,
			ATTACK,
			RANGED_ATTACK,
			HEAL,
			MOVE,
			MOVE,
			MOVE,
			MOVE,
		],
		boostedBody: {
			fixedBody: [
				RANGED_ATTACK,
				MOVE,
			],
			multiBody: [
				TOUGH,
				RANGED_ATTACK,
				HEAL,
				MOVE,
				MOVE,
			],
		},
		name: 'guard',
		behaviour: 'warrior',
		queue: 'High',
		sort: (a, b) => {
			const partsOrder = [TOUGH, MOVE, ATTACK, RANGED_ATTACK, HEAL];
			const indexOfA = partsOrder.indexOf(a);
			const indexOfB = partsOrder.indexOf(b);
			return indexOfA - indexOfB;
		},
		maxRange: 3,
	},
};
// check if a new creep has to be spawned
mod.checkForRequiredCreeps = (flag) => {
	// get task memory
	let memory = global.Task.guard.memory(flag);
	// re-validate if too much time has passed
	global.Task.validateAll(memory, flag, mod.name, {roomName: flag.pos.roomName, checkValid: true});
	// count creeps assigned to task
	let count = memory.queued.length + memory.spawning.length + memory.running.length;
	let boosted = flag.compareTo(global.FLAG_COLOR.defense.boosted);
	let guard = global.Task.guard.creep.guard;
	if (boosted) {
		guard.fixedBody = guard.boostedBody.fixedBody;
		guard.multiBody = guard.boostedBody.multiBody;
	}
	// if creep count below requirement spawn a new creep creep
	if (count < 1) {
		global.logSystem(flag.room.name, `SPAWNING GUARD for ${flag.name}`);
		global.Task.spawn(
			guard, // creepDefinition
			{ // destiny
				task: mod.name, // taskName
				targetName: flag.name, // targetName
				flagName: flag.name, // custom
				boosted: boosted,
			},
			{ // spawn room selection params
				targetRoom: flag.pos.roomName,
				minEnergyCapacity: Creep.bodyCosts(guard.fixedBody.concat(guard.multiBody)),
				rangeRclRatio: 3, // stronger preference of higher RCL rooms
				allowTargetRoom: true,
				//explicit: 'E23S24'
			},
			creepSetup => { // callback onQueued
				let memory = global.Task.guard.memory(Game.flags[creepSetup.destiny.targetName]);
				memory.queued.push({
					room: creepSetup.queueRoom,
					name: creepSetup.name,
					targetName: flag.name,
				});
			},
		);
	}
};
// when a creep starts spawning
mod.handleSpawningStarted = params => { // params: {spawn: spawn.name, name: creep.name, destiny: creep.destiny}
	// ensure it is a creep which has been queued by this task (else return)
	if (!params.destiny || !params.destiny.task || params.destiny.task !== 'guard')
		return;
	// get flag which caused queueing of that creep
	let flag = Game.flags[params.destiny.flagName];
	if (flag) {
		// get task memory
		let memory = global.Task.guard.memory(flag);
		// save spawning creep to task memory
		memory.spawning.push(params);
		// clean/validate task memory queued creeps
		global.Task.validateQueued(memory, flag, mod.name);
	}
};
// when a creep completed spawning
mod.handleSpawningCompleted = creep => {
	// ensure it is a creep which has been requested by this task (else return)
	if (!creep.data || !creep.data.destiny || !creep.data.destiny.task || creep.data.destiny.task !== 'guard')
		return;
	// get flag which caused request of that creep
	let flag = Game.flags[creep.data.destiny.flagName];
	if (flag) {
		// calculate & set time required to spawn and send next substitute creep
		// TODO: implement better distance calculation
		creep.data.predictedRenewal = creep.data.spawningTime + (global.Util.routeRange(creep.data.homeRoom, flag.pos.roomName) * 50);

		// get task memory
		let memory = global.Task.guard.memory(flag);
		// save running creep to task memory
		memory.running.push(creep.name);

		// clean/validate task memory spawning creeps
		global.Task.validateSpawning(memory, flag, mod.name);
	}
};
// when a creep died (or will die soon)
mod.handleCreepDied = name => {
	// get creep memory
	let mem = Memory.population[name];
	// ensure it is a creep which has been requested by this task (else return)
	if (!mem || !mem.destiny || !mem.destiny.task || mem.destiny.task !== 'guard')
		return;
	// get flag which caused request of that creep
	let flag = Game.flags[mem.destiny.flagName];
	if (flag) {
		const memory = global.Task.guard.memory(flag);
		global.Task.validateRunning(memory, flag, mod.name, {roomName: flag.pos.roomName, deadCreep: name});
	}
};
// get task memory
mod.memory = (flag) => {
	if (!flag.memory.tasks)
		flag.memory.tasks = {};
	if (!flag.memory.tasks.guard) {
		flag.memory.tasks.guard = {
			queued: [],
			spawning: [],
			running: [],
		};
	}
	return flag.memory.tasks.guard;
};
