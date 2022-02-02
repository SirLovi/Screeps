const mod = {};
module.exports = mod;



mod.minControllerLevel = 2;
mod.name = 'mining';
mod.register = () => {
};
mod.handleFlagRemoved = flagName => {
	// check flag
	const flagMem = Memory.flags[flagName];
	if (flagMem && flagMem.task === mod.name && flagMem.roomName) {
		// if there is still a mining flag in that room ignore.
		const flags = global.FlagDir.filter(global.FLAG_COLOR.claim.mining, new RoomPosition(25, 25, flagMem.roomName), true);
		if (flags && flags.length === 0) {
			// no more mining in that room.
			global.Task.cleanup(['remoteMiner', 'remoteWorker', 'remoteHauler'], mod.name, flagMem.roomName);
		}
	}
};
mod.handleFlagFound = flag => {
	// Analyze Flag
	if (flag.compareTo(global.FLAG_COLOR.claim.mining) && global.Task.nextCreepCheck(flag, mod.name)) {
		global.Util.set(flag.memory, 'roomName', flag.pos.roomName);
		global.Util.set(flag.memory, 'task', mod.name);
		// check if a new creep has to be spawned
		global.Task.mining.checkForRequiredCreeps(flag);
	}
};
// remove creep from task memory of queued creeps
mod.handleSpawningStarted = params => {
	if (!params.destiny || !params.destiny.task || params.destiny.task !== mod.name)
		return;
	const memory = global.Task.mining.memory(params.destiny.room);
	const flag = Game.flags[params.destiny.targetName];
	if (flag) {
		// validate currently queued entries and clean out spawned creep
		const priority = _.find(global.Task.mining.creep, {behaviour: params.destiny.type}).queue;
		global.Task.validateQueued(memory, flag, mod.name, {subKey: params.destiny.type, queues: [priority]});

		if (params.body)
			params.body = _.countBy(params.body);
		// save spawning creep to task memory
		memory.spawning[params.destiny.type].push(params);
	}
};
mod.handleSpawningCompleted = creep => {
	if (!creep.data.destiny || !creep.data.destiny.task || creep.data.destiny.task != mod.name)
		return;
	if (creep.data.destiny.homeRoom) {
		creep.data.homeRoom = creep.data.destiny.homeRoom;
	}
	const flag = Game.flags[creep.data.destiny.targetName];
	if (flag) {
		// calculate & set time required to spawn and send next substitute creep
		// TODO: implement better distance calculation
		creep.data.predictedRenewal = creep.data.spawningTime + (global.Util.routeRange(creep.data.homeRoom, creep.data.destiny.room) * 50);
		// get task memory
		const memory = global.Task.mining.memory(creep.data.destiny.room);
		// save running creep to task memory
		memory.running[creep.data.destiny.type].push(creep.name);
		// clean/validate task memory spawning creeps
		global.Task.validateSpawning(memory, flag, mod.name, {roomName: creep.data.destiny.room, subKey: creep.data.destiny.type});
	}
};
// when a creep died (or will die soon)
mod.handleCreepDied = name => {
	// get creep memory
	const mem = Memory.population[name];
	// ensure it is a creep which has been requested by this task (else return)
	if (!mem || !mem.destiny || !mem.destiny.task || mem.destiny.task !== mod.name)
		return;
	const flag = Game.flags[mem.destiny.targetName];
	if (flag) {
		// clean/validate task memory running creeps
		const memory = global.Task.mining.memory(mem.destiny.room);
		global.Task.validateRunning(memory, flag, mod.name, {subKey: mem.creepType, roomName: mem.destiny.room, deadCreep: name});
	}
};
mod.needsReplacement = (creep) => {
	// this was used below in maxWeight, perhaps it's more accurate?
	// (c.ticksToLive || CREEP_LIFE_TIME) < (50 * travel - 40 + c.data.spawningTime)
	return !creep || (creep.ticksToLive || CREEP_LIFE_TIME) < (creep.data.predictedRenewal || 0);
};
// check if a new creep has to be spawned
mod.checkForRequiredCreeps = (flag) => {
	const roomName = flag.pos.roomName;
	const room = Game.rooms[roomName];
	// Use the roomName as key in Task.memory?
	// Prevents accidentally processing same room multiple times if flags > 1
	const memory = global.Task.mining.memory(roomName);

	// get number of sources
	let sourceCount;
	// has visibility. get cached property.
	if (room)
		sourceCount = room.sources.length;
	// no visibility, but been there before
	else if (Memory.rooms[roomName] && Memory.rooms[roomName].sources)
		sourceCount = Memory.rooms[roomName].sources.length;
	// never been there
	else
		sourceCount = 1;

	const countExisting = type => {
		const priority = _.find(global.Task.mining.creep, {behaviour: type}).queue;

		global.Task.validateAll(memory, flag, mod.name, {roomName, subKey: type, queues: [priority], checkValid: true, task: mod.name});

		return memory.queued[type].length + memory.spawning[type].length + memory.running[type].length;
	};
	const haulerCount = countExisting('remoteHauler');
	const minerCount = countExisting('remoteMiner');
	const workerCount = countExisting('remoteWorker');

	// TODO: calculate creeps by type needed per source / mineral

	if (global.DEBUG && global.TRACE)
		global.trace('Task', {Task: mod.name, flagName: flag.name, sourceCount, haulerCount, minerCount, workerCount, [mod.name]: 'Flag.found'}, 'checking flag@', flag.pos);

	if (mod.strategies.miner.shouldSpawn(minerCount, sourceCount)) {
		if (global.DEBUG && global.TRACE)
			global.trace('Task', {
				Task: mod.name, room: roomName, minerCount,
				minerTTLs: _.map(_.map(memory.running.remoteMiner, n => Game.creeps[n]), 'ticksToLive'), [mod.name]: 'minerCount',
			});
		const miner = mod.strategies.miner.setup(roomName);
		for (let i = minerCount; i < sourceCount; i++) {
			global.Task.spawn(
				miner, // creepDefinition
				{ // destiny
					task: mod.name, // taskName
					targetName: flag.name, // targetName
					type: miner.behaviour, // custom
				},
				{ // spawn room selection params
					targetRoom: roomName,
					minEnergyCapacity: miner.minEnergyCapacity, // TODO calculate this
					rangeRclRatio: 1,
				},
				creepSetup => { // onQueued callback
					const memory = global.Task.mining.memory(creepSetup.destiny.room);
					memory.queued[creepSetup.behaviour].push({
						room: creepSetup.queueRoom,
						name: creepSetup.name,
					});
				},
			);
		}
	}

	// only spawn haulers for sources a miner has been spawned for

	let maxHaulers;
	let droppedEnergy;

	if (room)
		droppedEnergy = _.sum(room.droppedResources, 'energy');

	if (droppedEnergy && droppedEnergy > 500)
		maxHaulers = Math.ceil(memory.running.remoteMiner.length * global.REMOTE_HAULER.MULTIPLIER)
	else
		maxHaulers = memory.running.remoteMiner.length;


	console.log(`MAX HAULERS for ${roomName}: ${maxHaulers}`);

	if (haulerCount < maxHaulers && (!memory.capacityLastChecked || Game.time - memory.capacityLastChecked > global.TASK_CREEP_CHECK_INTERVAL)) {
		for (let i = haulerCount; i < maxHaulers; i++) {
			let minWeight = i >= 1 && global.REMOTE_HAULER.MIN_WEIGHT;
			const spawnRoom = mod.strategies.hauler.spawnRoom(roomName, minWeight);

			if (!spawnRoom)
				break;

			// haulers set homeRoom if closer storage exists
			const storageRoomName = global.REMOTE_HAULER.REHOME ? mod.strategies.hauler.homeRoomName(roomName) : spawnRoom.name;
			let maxWeight = mod.strategies.hauler.maxWeight(roomName, storageRoomName, memory); // TODO Task.strategies
			if (!maxWeight || (!global.REMOTE_HAULER.ALLOW_OVER_CAPACITY && maxWeight < minWeight)) {
				memory.capacityLastChecked = Game.time;
				break;
			}

			if (_.isNumber(global.REMOTE_HAULER.ALLOW_OVER_CAPACITY)) {
				maxWeight = Math.max(maxWeight, global.REMOTE_HAULER.ALLOW_OVER_CAPACITY);
				minWeight = minWeight && Math.min(global.REMOTE_HAULER.MIN_WEIGHT, maxWeight);
			} else if (global.REMOTE_HAULER.ALLOW_OVER_CAPACITY) {
				maxWeight = Math.max(maxWeight, global.REMOTE_HAULER.MIN_WEIGHT);
				minWeight = minWeight && Math.min(global.REMOTE_HAULER.MIN_WEIGHT, maxWeight);
			}

			// spawning a new hauler
			let hauler = mod.strategies.hauler.setup(roomName);
			hauler.maxWeight = maxWeight;
			if (minWeight)
				hauler.minWeight = minWeight;

			if (hauler.fixedBody.length >= 50) {
				console.log(`hauler fixedBody: ${hauler.fixedBody.length}`);
				console.log(`hauler maxWeight: ${hauler.maxWeight}`);
				console.log(`hauler minWeight: ${hauler.minWeight}`);
			}
			global.Task.spawn(
				hauler,
				{ // destiny
					task: mod.name, // taskName
					targetName: flag.name, // targetName
					type: global.Task.mining.creep.hauler.behaviour, // custom
					homeRoom: storageRoomName,
				}, {
					targetRoom: roomName,
					explicit: spawnRoom.name,
				},
				creepSetup => { // onQueued callback
					const memory = global.Task.mining.memory(creepSetup.destiny.room);
					global.logSystem(roomName, `hauler creepSetup ${creepSetup.parts.length}`);
					memory.queued[creepSetup.behaviour].push({
						room: creepSetup.queueRoom,
						name: creepSetup.name,
						body: _.countBy(creepSetup.parts),
					});
				},
			);
		}
	}
	if (room && room.myConstructionSites.length > 0 && workerCount < global.REMOTE_WORKER_MULTIPLIER) {
		for (let i = workerCount; i < global.REMOTE_WORKER_MULTIPLIER; i++) {
			global.Task.spawn(
				global.Task.mining.creep.worker, // creepDefinition
				{ // destiny
					task: mod.name, // taskName
					targetName: flag.name, // targetName
					type: global.Task.mining.creep.worker.behaviour, // custom
				},
				{ // spawn room selection params
					targetRoom: roomName,
					minEnergyCapacity: 600,
				},
				creepSetup => { // onQueued callback
					const memory = global.Task.mining.memory(creepSetup.destiny.room);
					memory.queued[creepSetup.behaviour].push({
						room: creepSetup.queueRoom,
						name: creepSetup.name,
					});
				},
			);
		}
	}
};
mod.findSpawning = (roomName, type) => {
	const spawning = [];
	_.forEach(Game.spawns, s => {
		if (s.spawning && (_.includes(s.spawning.name, type) || (s.newSpawn && _.includes(s.newSpawn.name, type)))) {
			const c = global.Population.getCreep(s.spawning.name);
			if (c && c.destiny.room === roomName) {
				const params = {
					spawn: s.name,
					name: s.spawning.name,
					destiny: c.destiny,
				};
				spawning.push(params);
			}
		}
	});
	return spawning;
};
mod.findRunning = (roomName, type) => {
	const running = [];
	_.forEach(Game.creeps, c => {
		if (!c.spawning && c.data.creepType === type && c.data && c.data.destiny && c.data.destiny.room === roomName) {
			running.push(c.name);
		}
	});
	return running;
};
mod.memory = key => {
	const memory = global.Task.memory(mod.name, key);
	if (!memory.hasOwnProperty('queued')) {
		memory.queued = {
			remoteMiner: [],
			remoteHauler: [],
			remoteWorker: [],
		};
	}
	if (!memory.hasOwnProperty('spawning')) {
		memory.spawning = {
			remoteMiner: global.Task.mining.findSpawning(key, 'remoteMiner'),
			remoteHauler: global.Task.mining.findSpawning(key, 'remoteHauler'),
			remoteWorker: global.Task.mining.findSpawning(key, 'remoteWorker'),
		};
	}
	if (!memory.hasOwnProperty('running')) {
		memory.running = {
			remoteMiner: global.Task.mining.findRunning(key, 'remoteMiner'),
			remoteHauler: global.Task.mining.findRunning(key, 'remoteHauler'),
			remoteWorker: global.Task.mining.findRunning(key, 'remoteWorker'),
		};
	}
	if (!memory.hasOwnProperty('nextSpawnCheck')) {
		memory.nextSpawnCheck = {};
	}
	// temporary migration
	if (memory.queued.miner) {
		memory.queued.remoteMiner = memory.queued.miner;
		delete memory.queued.miner;
	}
	if (memory.queued.hauler) {
		memory.queued.remoteHauler = memory.queued.hauler;
		delete memory.queued.hauler;
	}
	if (memory.queued.worker) {
		memory.queued.remoteWorker = memory.queued.worker;
		delete memory.queued.worker;
	}

	return memory;
};
mod.creep = {
	miner: {
		fixedBody: {
			[CARRY]: 0,
			[MOVE]: 1,
			[WORK]: 5,
			[HEAL]: 0,
		},
		multiBody: {
			[CARRY]: 1,
			[MOVE]: 4,
			[WORK]: 5,
		},
		maxMulti: 1,
		minEnergyCapacity: 550,
		behaviour: 'remoteMiner',
		queue: 'Medium', // not much point in hauling or working without a miner, and they're a cheap spawn.
	},
	hauler: {
		fixedBody: {
			[CARRY]: 4,
			[MOVE]: 3,
			[WORK]: 1,
			[HEAL]: 0,
		},
		multiBody: {
			[CARRY]: 1,
			[MOVE]: 1,
		},
		behaviour: 'remoteHauler',
		queue: 'Low',
	},
	worker: {
		fixedBody: {
			[CARRY]: 4,
			[MOVE]: 3,
			[WORK]: 3,
			[HEAL]: 0,
		},
		multiBody: {
			[CARRY]: 2,
			[MOVE]: 2,
			[WORK]: 2,
		},
		maxMulti: 3,
		behaviour: 'remoteWorker',
		queue: 'Low',
	},
	SKMiner: {
		fixedBody: {
			[CARRY]: 0,
			[MOVE]: 1,
			[WORK]: 5,
			[HEAL]: 0,
		},
		multiBody: {
			[CARRY]: 1,
			[MOVE]: 4,
			[WORK]: 5,
		},
		maxMulti: 1,
		behaviour: 'remoteMiner',
		queue: 'Medium', // not much point in hauling or working without a miner, and they're a cheap spawn.
	},
	SKHauler: {
		fixedBody: {
			[CARRY]: 4,
			[MOVE]: 5,
			[WORK]: 1,
			[HEAL]: 0,
		},
		multiBody: {
			[CARRY]: 1,
			[MOVE]: 1,
		},
		behaviour: 'remoteHauler',
		queue: 'Low',
	},
};
mod.bodyToArray = (definition) => {

	let fixedBody = [];
	console.log(`definition: ${global.json(definition)}`);
	for (let [bodyPart, count] of Object.entries(definition)) {
		console.log(`bodyPart: ${bodyPart} count: ${count}`);
		fixedBody = fixedBody.concat(_.times(count, _.constant(bodyPart)));
	}

	console.log(`bodyToArray ret: ${fixedBody.length}`);
	return fixedBody;
};
mod.setupCreep = function (roomName, definition) {

	// mod.checkCarryParts(roomName);
	// mod.checkHealParts(roomName);
	// mod.checkWorkParts(roomName);

	const memory = Memory.tasks.mining[roomName];
	const carrySize = memory.carrySize || 0;
	const workSize = memory.harvestSize || 0;
	const healSize = memory.healSize || 0;

	if (definition.behaviour === 'remoteMiner') {

		definition.fixedBody[WORK] += workSize;
		definition.moveRatio = ((healSize + workSize) % 2) * -0.5 + (definition.moveRatio || 0);
		definition.fixedBody[MOVE] += Math.ceil((healSize + (memory.harvestSize || 0)) * 0.5 + (definition.moveRatio || 0));


		return definition;

	} else if (definition.behaviour === 'remoteHauler') {

		definition.fixedBody[CARRY] += carrySize;
		definition.moveRatio = ((healSize + carrySize) % 2) * -0.5 + (definition.moveRatio || 0);
		definition.fixedBody[MOVE] += Math.ceil((healSize + (memory.carrySize || 0)) * 0.5 + (definition.moveRatio || 0));

		return definition;
	}
};
mod.getFlag = function (roomName) {
	return global.FlagDir.find(global.FLAG_COLOR.claim.mining, new RoomPosition(25, 25, roomName));
};
mod.carry = function (roomName, partChange, population) {
	let memory = Memory.tasks.mining[roomName];
	memory.carrySize = (memory.carrySize || 0) + (partChange || 0);
	// const population = Math.round(mod.carryPartsPopulation(roomName) * 100);
	if (partChange) {
		global.Task.forceCreepCheck(global.Task.mining.getFlag(roomName), mod.name);
		delete memory.capacityLastChecked;
	}
	// memory.carrySize = (memory.carrySize || 0) <= 0 ? 0 : memory.carrySize;
	memory.carrySize = (memory.carrySize || 0) >= 6 ? 6 : memory.carrySize;
	global.logSystem(roomName, `Task.${mod.name}: hauler carry capacity for ${roomName} ${partChange >= 0 ? 'increased' : 'decreased'} by ${partChange}. Currently at ${population}% of desired carryPartsPopulation. Currently added ${memory.carrySize}`);
};
mod.work = function (roomName, partChange) {
	let memory = Memory.tasks.mining[roomName];
	memory.harvestSize = (memory.harvestSize || 0) + (partChange || 0);
	memory.harvestSize = (memory.harvestSize || 0) < 0 ? 0 : memory.harvestSize;
	global.logSystem(roomName, `Task.${mod.name}: harvesting work capacity for ${roomName} ${partChange >= 0 ? 'increased' : 'decreased'} by ${partChange} for remoteMiner. Currently added ${memory.harvestSize}`);
};
mod.heal = function (roomName, partChange) {
	let memory = Memory.tasks.mining[roomName];
	memory.healSize = (memory.healSize || 0) + (partChange || 0);
	memory.healSize = (memory.healSize || 0) <= 0 ? 0 : memory.healSize;
	memory.healSize = (memory.healSize || 0) >= 2 ? 2 : memory.healSize;
	global.logSystem(roomName, `Task.${this.name}: healing capacity for ${roomName} ${memory.healSize >= 0 ? 'increased' : 'decreased'} to ${memory.healSize} for remoteMiner/remoteHauler. Currently added ${memory.healSize}`);
};
mod.checkWorkParts = function (roomName) {
	console.log(`BodyParts count WORK for ${roomName} is started`);
	mod.work(roomName, 0);
};
mod.checkHealParts = function (roomName) {
	let room = Game.rooms[roomName];
	if (_.isUndefined(room))
		return;
	console.log(`BodyParts count HEAL for ${roomName} is started. Defense level: ${room.defenseLevel.sum} Threat level: ${room.hostileThreatLevel}`);
	if (room.hostileThreatLevel > room.defenseLevel.sum) {
		mod.heal(roomName, 2);
	} else if (room) {
		mod.heal(roomName, -2);
	}
};
mod.checkCarryParts = function (roomName) {

	// if (Game.rooms[roomName].hostiles.length > 0 && !Game.rooms[roomName].isCenterNineRoom) {
	// 	return `Task.${mod.name} in ${roomName} is under attack, check carryCapacity later `;
	// }

	const checkRoomCapacity = function (roomName, minCarryPartsPercent, maxDropped) {
		const carryPartsPercent = Math.round(mod.carryPartsPopulation(roomName) * 100);

		if (carryPartsPercent === 100)
			return false;

		const room = Game.rooms[roomName];
		const dropped = room ? room.find(FIND_DROPPED_RESOURCES) : null;

		let message = '';
		// if room is visible
		if (!_.isNull(dropped)) {
			let totalDropped = 0;
			if (dropped.length >= 1) {
				totalDropped = _.sum(dropped, d => d.energy);
				message = 'with ' + totalDropped + ' dropped energy.';
			}

			console.log(`BodyParts count CARRY for ${roomName} is started`);
			console.log(`dropped: ${totalDropped} carryPartsPercent: ${carryPartsPercent}`);

			if (carryPartsPercent === 100 && totalDropped === 0) {
				mod.carry(roomName, -2, carryPartsPercent);
				return true;
			} else if (carryPartsPercent >= minCarryPartsPercent && totalDropped >= maxDropped) {
				mod.carry(roomName, 2, carryPartsPercent, message);
				return true;

			}
			// global.logSystem(roomName, `carryPartsPercent: ${global.Task.mining.memory(roomName).carryPartsPercent}`);

		} else
			console.log(`${roomName} unknown dropped energy, room not visible.`);
		// console.log(mod.harvest(roomName));
		// console.log(mod.heal(roomName));

		return false;
	};
	if (roomName) {
		return checkRoomCapacity(roomName, 0, 500);
	} else {
		let count = 0;
		let total = 0;
		for (const roomName in Memory.tasks.mining) {
			total++;
			if (checkRoomCapacity(roomName, 0, 500))
				count++;
		}
		return `Task.${mod.name} ${count} rooms under-capacity out of ${total}.`;
	}
};
mod.storage = function (miningRoom, storageRoom) {
	const room = Game.rooms[miningRoom];
	const memory = global.Task.mining.memory(miningRoom);
	if (storageRoom) {
		const was = memory.storageRoom;
		memory.storageRoom = storageRoom;
		return `Task.${mod.name}: room ${miningRoom}, now sending haulers to ${storageRoom}, (was ${was})`;
	} else if (!memory.storageRoom) {
		return `Task.${mod.name}: room ${miningRoom}, no custom storage destination`;
	} else if (storageRoom === false) {
		const was = memory.storageRoom;
		delete memory.storageRoom;
		return `Task.${mod.name}: room ${miningRoom}, cleared custom storage room (was ${was})`;
	} else {
		return `Task.${mod.name}: room ${miningRoom}, sending haulers to ${memory.storageRoom}`;
	}
};
mod.carryPartsPopulation = function (miningRoomName, homeRoomName) {
	// how much more do we need to meet our goals
	const neededWeight = global.Task.mining.strategies.hauler.maxWeight(miningRoomName, homeRoomName, undefined, false, true);
	// how much do we need for this room in total
	const totalWeight = global.Task.mining.strategies.hauler.maxWeight(miningRoomName, homeRoomName, undefined, true, true);
	const ret = 1 - neededWeight / totalWeight;

	if (ret !== 0) {
		global.logSystem(miningRoomName, `neededWeight: ${neededWeight} totalWeight: ${totalWeight} ret: ${ret}`);
		// console.log(`miningRoom: ${miningRoomName} homeRoom: ${homeRoomName}`);
		// console.log(`neededWeight: ${neededWeight} totalWeight: ${totalWeight} ret: ${ret}`);
	}

	// it is 0, if we need is 0, -ret if we need more
	return ret;
};
mod.countEnergyPrice = function(fixedBody, multiBody) {
	// console.log(`fixedBody: ${global.json(fixedBody)}`);
	// console.log(`multiBody: ${global.json(multiBody)}`);
	let fixedCost = 0,
		multiCost = 0;
	for (const [part, amount] of Object.entries(fixedBody)) {
		switch (part) {
			case CARRY:
				fixedCost += BODYPART_COST[CARRY] * amount;
				break;
			case MOVE:
				fixedCost += BODYPART_COST[MOVE] * amount;
				break;
			case WORK:
				fixedCost += BODYPART_COST[WORK] * amount;
				break;
			case HEAL:
				fixedCost += BODYPART_COST[HEAL] * amount;
				break;
		}
	}
	for (const [part, amount] of Object.entries(multiBody)) {
		switch (part) {
			case CARRY:
				multiCost += BODYPART_COST[CARRY] * amount;
				break;
			case MOVE:
				multiCost += BODYPART_COST[MOVE] * amount;
				break;
			case WORK:
				multiCost += BODYPART_COST[WORK] * amount;
				break;
			case HEAL:
				multiCost += BODYPART_COST[HEAL] * amount;
				break;
		}
	}

	return {
		fixedCost: fixedCost,
		multiCost: multiCost
	}
};
function haulerCarryToWeight(carry, setup) {
	if (!carry || carry < 0)
		return 0;

	const multiCarry = _.max([0, carry - 5]);
	const cost = mod.countEnergyPrice(setup.fixedBody, setup.multiBody)
	const fixedBodyCost = cost.fixedCost;
	const multiBodyCost = cost.multiCost;
	const ret = fixedBodyCost + multiBodyCost * _.ceil(multiCarry * 0.5);

	console.log(`fixedCost: ${fixedBodyCost}`);
	console.log(`multiCost: ${multiBodyCost}`);
	console.log(`haulerCarryToWeight: ${ret}`);

	return ret;
}
mod.strategies = {
	defaultStrategy: {
		name: `default-${mod.name}`,
	},
	reserve: {
		name: `reserve-${mod.name}`,
		spawnParams: function (flag) {
			const population = mod.carryPartsPopulation(flag.pos.roomName);

			if (population < global.REMOTE_RESERVE_HAUL_CAPACITY) {
				// TODO if this room & all exits are currently reserved (by anyone) then use default to prevent Invaders?
				if (global.DEBUG && global.TRACE)
					global.trace('Task', {flagName: flag.name, pos: flag.pos, population, spawnParams: 'population', [mod.name]: 'spawnParams', Task: mod.name});
				return {count: 0, priority: 'Low'};
			}

			return global.Task.reserve.strategies.defaultStrategy.spawnParams(flag);
		},
	},
	miner: {
		name: `miner-${mod.name}`,
		setup: function (roomName) {
			return mod.setupCreep(roomName, Room.isCenterNineRoom(roomName) ? _.cloneDeep(global.Task.mining.creep.SKMiner) : _.cloneDeep(global.Task.mining.creep.miner));
		},
		shouldSpawn: function (minerCount, sourceCount) {
			return minerCount < sourceCount;
		},
	},
	hauler: {
		name: `hauler-${mod.name}`,
		setup: function (roomName) {
			return mod.setupCreep(roomName, Room.isCenterNineRoom(roomName) ? _.cloneDeep(global.Task.mining.creep.SKHauler) : _.cloneDeep(global.Task.mining.creep.hauler));
		},
		ept: function (roomName) {
			const room = Game.rooms[roomName];
			if (Room.isCenterNineRoom(roomName)) {
				return room ? 14 * room.sources.length : 42;
			} else {
				return room ? 10 * room.sources.length : 20;
			}
		},
		homeRoomName: function (flagRoomName) {
			// Explicity set by user?
			const memory = global.Task.mining.memory(flagRoomName);
			if (memory.storageRoom)
				return memory.storageRoom;
			// Otherwise, score it
			return Room.bestSpawnRoomFor(flagRoomName).name;
		},
		spawnRoom: function (flagRoomName, minWeight) {
			return Room.findSpawnRoom({
				targetRoom: flagRoomName,
				minEnergyCapacity: minWeight || 500,
			});
		},
		maxWeight: function (flagRoomName, homeRoomName, memory, ignorePopulation, ignoreQueue) {
			if (!homeRoomName)
				homeRoomName = mod.strategies.hauler.homeRoomName(flagRoomName);
			if (!memory)
				memory = global.Task.mining.memory(flagRoomName);

			const existingHaulers = ignorePopulation ? [] : _.map(memory.running.remoteHauler, n => Game.creeps[n]);
			const queuedHaulers = ignoreQueue ? [] : _.union(memory.queued.remoteHauler, memory.spawning.remoteHauler);
			const room = Game.rooms[flagRoomName];

			// TODO loop per-source, take pinned delivery for route calc

			const travel = global.Util.routeRange(flagRoomName, homeRoomName);
			const ept = global.Task.mining.strategies.hauler.ept(flagRoomName);
			// carry = ept * travel * 2 * 50 / 50
			const validHaulers = _.filter(existingHaulers, c => !global.Task.mining.needsReplacement(c));
			const existingCarry = _.sum(validHaulers, c => (c && c.data && c.data.body) ? c.data.body.carry : 5);
			const queuedCarry = _.sum(queuedHaulers, c => (c && c.body) ? c.body.carry : 5);
			const neededCarry = ept * travel * 2 + (memory.carrySize || 0) - existingCarry - queuedCarry;
			// console.log(`this setup: ${global.json(this.setup(flagRoomName))}`);
			const maxWeight = haulerCarryToWeight(neededCarry, this.setup(flagRoomName));
			if (global.DEBUG && global.TRACE)
				global.trace('Task', {
					Task: mod.name, room: flagRoomName, homeRoom: homeRoomName,
					haulers: existingHaulers.length + queuedHaulers.length, ept, travel, existingCarry, queuedCarry,
					neededCarry, maxWeight, [mod.name]: 'maxWeight',
				});
			return maxWeight;
		},
	},
};
