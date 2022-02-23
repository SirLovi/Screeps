const mod = {};
module.exports = mod;
mod.minControllerLevel = 2;
mod.name = 'mining';
mod.register = () => {
};
mod.count = (miningRoomName, type, memory, flag) => {
	const countExisting = type => {
		const priority = _.find(global.Task.mining.creep, {behaviour: type}).queue;
		global.Task.validateAll(memory, flag, mod.name, {roomName: miningRoomName, subKey: type, queues: [priority], checkValid: true, task: mod.name});
		return memory.queued[type].length + memory.spawning[type].length + memory.running[type].length;
	};
	return countExisting(type);
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
	if (!creep.data.destiny || !creep.data.destiny.task || creep.data.destiny.task !== mod.name)
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
	const miningRoomName = flag.pos.roomName;
	const room = Game.rooms[miningRoomName];
	// Use the miningRoomName as key in Task.memory?
	// Prevents accidentally processing same room multiple times if flags > 1
	const memory = global.Task.mining.memory(miningRoomName);

	// get number of sources
	let sourceCount;
	// has visibility. get cached property.
	if (room)
		sourceCount = room.sources.length;
	// no visibility, but been there before
	else if (Memory.rooms[miningRoomName] && Memory.rooms[miningRoomName].sources)
		sourceCount = Memory.rooms[miningRoomName].sources.length;
	// never been there
	else
		sourceCount = 1;

	const haulerCount = mod.count(miningRoomName, 'remoteHauler', memory, flag);
	const minerCount = mod.count(miningRoomName, 'remoteMiner', memory, flag);
	const workerCount = mod.count(miningRoomName, 'remoteWorker', memory, flag);


	// TODO: calculate creeps by type needed per source / mineral

	if (global.DEBUG && global.TRACE)
		global.trace('Task', {Task: mod.name, flagName: flag.name, sourceCount, haulerCount, minerCount, workerCount, [mod.name]: 'Flag.found'}, 'checking flag@', flag.pos);

	if (mod.strategies.miner.shouldSpawn(minerCount, sourceCount)) {
		if (global.DEBUG && global.TRACE)
			global.trace('Task', {
				Task: mod.name, room: miningRoomName, minerCount,
				minerTTLs: _.map(_.map(memory.running.remoteMiner, n => Game.creeps[n]), 'ticksToLive'), [mod.name]: 'minerCount',
			});
		const miner = mod.strategies.miner.setup(miningRoomName);
		for (let i = minerCount; i < sourceCount; i++) {
			global.Task.spawn(
				miner, // creepDefinition
				{ // destiny
					task: mod.name, // taskName
					targetName: flag.name, // targetName
					type: miner.behaviour, // custom
				},
				{ // spawn room selection params
					targetRoom: miningRoomName,
					minEnergyCapacity: Creep.bodyCosts(miner.fixedBody),
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

	let dropped = room ? room.droppedResourcesAmount() : 0;

	if (dropped > 500)
		maxHaulers = global.round((memory.running.remoteMiner.length || 1) * global.REMOTE_HAULER.MULTIPLIER);
	else
		maxHaulers = memory.running.remoteMiner.length || 0;

	// global.logSystem(miningRoomName, `MAX HAULERS for ${miningRoomName}: ${maxHaulers} => needMore: ${haulerCount < maxHaulers}, time: ${!memory.capacityLastChecked || Game.time - memory.capacityLastChecked > global.TASK_CREEP_CHECK_INTERVAL}`);

	if (haulerCount < maxHaulers && (!memory.capacityLastChecked || Game.time - memory.capacityLastChecked > global.TASK_CREEP_CHECK_INTERVAL)) {
		for (let i = haulerCount; i < maxHaulers; i++) {
			// let minWeight = i >= 1 && global.REMOTE_HAULER.MIN_WEIGHT;
			let minWeight = global.REMOTE_HAULER.MIN_WEIGHT;
			let hauler = mod.strategies.remoteHauler.setup(miningRoomName);
			let spawnRoomName = mod.strategies.remoteHauler.getSpawnRoomName(miningRoomName, minWeight, Creep.bodyCosts(hauler.fixedBody), hauler.behaviour);
			const spawnRoom = Game.rooms[spawnRoomName];

			// console.log(`miningRoom: ${miningRoomName} spawnRoom: ${spawnRoomName}`);

			if (!spawnRoom)
				break;

			// haulers set homeRoom if closer storage exists
			const storageRoomName = global.REMOTE_HAULER.REHOME ? mod.strategies.remoteHauler.homeRoomName(miningRoomName) : spawnRoomName;
			let maxWeight = mod.strategies.remoteHauler.maxWeight(miningRoomName, spawnRoomName, memory); // TODO Task.strategies
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

			// spawning a new remoteHauler

			hauler.maxWeight = maxWeight;

			if (minWeight)
				hauler.minWeight = minWeight;

			let maxMulti = mod.strategies.remoteHauler.maxMulti(flag.room);

			hauler.maxMulti = maxMulti;

			if (flag.room.isCenterNineRoom)
				global.logSystem(flag.room.name, `SKHauler maxMulti is ${maxMulti}`);
			else
				global.logSystem(flag.room.name, `remoteHauler maxMulti is ${maxMulti}`);


			// console.log(`remoteHauler fixedBody: ${Creep.bodyCosts(remoteHauler.fixedBody)}`);
			// console.log(`remoteHauler maxWeight: ${remoteHauler.maxWeight}`);
			// console.log(`remoteHauler minWeight: ${remoteHauler.minWeight}`);

			global.Task.spawn(
				hauler, // creepDefinition
				{ // destiny
					task: mod.name, // taskName
					targetName: flag.name, // targetName
					type: hauler.behaviour, // custom
					homeRoom: storageRoomName,
				},
				{ // spawn room selection params
					targetRoom: miningRoomName,
					explicit: spawnRoom.name,
					minEnergyCapacity: Creep.bodyCosts(hauler.fixedBody),
				},
				creepSetup => { // onQueued callback
					const memory = global.Task.mining.memory(creepSetup.destiny.room);
					if (global.DEBUG && global.debugger(global.DEBUGGING.findSpawnRoom, spawnRoomName))
						global.logSystem(miningRoomName, `hauler creepSetup size ${creepSetup.parts.length}`);
					// global.logSystem(storageRoomName, `HAULER QUEUED: ${global.json(remoteHauler)}`);
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
		let worker = global.Task.mining.creep.worker;
		for (let i = workerCount; i < global.REMOTE_WORKER_MULTIPLIER; i++) {
			global.Task.spawn(
				worker, // creepDefinition
				{ // destiny
					task: mod.name, // taskName
					targetName: flag.name, // targetName
					type: global.Task.mining.creep.worker.behaviour, // custom
				},
				{ // spawn room selection params
					targetRoom: miningRoomName,
					minEnergyCapacity: Creep.bodyCosts(worker.fixedBody),
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
	// if (memory.queued.miner) {
	// 	memory.queued.remoteMiner = memory.queued.miner;
	// 	delete memory.queued.miner;
	// }
	// if (memory.queued.remoteHauler) {
	// 	memory.queued.remoteHauler = memory.queued.remoteHauler;
	// 	delete memory.queued.remoteHauler;
	// }
	// if (memory.queued.worker) {
	// 	memory.queued.remoteWorker = memory.queued.worker;
	// 	delete memory.queued.worker;
	// }

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
		behaviour: 'remoteMiner',
		queue: 'Medium', // not much point in hauling or working without a miner, and they're a cheap spawn.
	},
	remoteHauler: {
		fixedBody: {
			[CARRY]: 2,
			[MOVE]: 2,
			[WORK]: 1,
			[HEAL]: 0,
		},
		multiBody: {
			[CARRY]: 2,
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
			[WORK]: 6,
			[HEAL]: 1,
		},
		multiBody: {
			[CARRY]: 1,
			[MOVE]: 4,
			[WORK]: 5,
		},
		maxMulti: 1,
		behaviour: 'remoteMiner',
		queue: 'Medium', // not much point in hauling or working without a miner, and they're a cheap spawn.
		maxRange: 3,
	},
	SKHauler: {
		fixedBody: {
			[CARRY]: 1,
			[MOVE]: 2,
			[WORK]: 1,
			[HEAL]: 1,
		},
		multiBody: {
			[CARRY]: 2,
			[MOVE]: 1,
		},
		behaviour: 'remoteHauler',
		queue: 'Low',
		maxRange: 4,
	},
};
mod.countBody = function (fixedBody) {
	let count = 0;
	for (const [fixedBodyPart, amount] of Object.entries(fixedBody)) {
		if (fixedBodyPart !== MOVE) {
			count += amount;
		}
	}

	return count;

};
mod.setupCreep = function (roomName, definition) {

	let fixedLength = mod.countBody(definition.fixedBody) % 2;
	definition.moveRatio = fixedLength * -0.5 + (definition.moveRatio || 0);
	definition.fixedBody[MOVE] += Math.ceil(fixedLength * 0.5 + (definition.moveRatio || 0));

	return definition;
};
mod.getFlag = function (roomName) {
	return global.FlagDir.find(global.FLAG_COLOR.claim.mining, new RoomPosition(25, 25, roomName));
};

mod.storage = function (miningRoom, storageRoom) {

	const memory = global.Task.mining.memory(miningRoom);
	if (storageRoom) {
		const was = memory.storageRoomName;
		memory.storageRoomName = storageRoom;
		return `Task.${mod.name}: room ${miningRoom}, now sending haulers to ${storageRoom}, (was ${was})`;
	} else if (!memory.storageRoomName) {
		return `Task.${mod.name}: room ${miningRoom}, no custom storage destination`;
	} else if (storageRoom === false) {
		const was = memory.storageRoomName;
		delete memory.storageRoomName;
		return `Task.${mod.name}: room ${miningRoom}, cleared custom storage room (was ${was})`;
	} else {
		return `Task.${mod.name}: room ${miningRoom}, sending haulers to ${memory.storageRoomName}`;
	}
};
mod.carryPartsPopulation = function (miningRoomName, homeRoomName) {
	// how much more do we need to meet our goals
	const neededWeight = global.Task.mining.strategies.remoteHauler.maxWeight(miningRoomName, homeRoomName, undefined, false, true);
	// how much do we need for this room in total
	const totalWeight = global.Task.mining.strategies.remoteHauler.maxWeight(miningRoomName, homeRoomName, undefined, true, true);
	const ret = 1 - neededWeight / totalWeight;


	// it is 0, if we need is 0, -ret if we need more
	return {
		ret: ret,
		neededWeight: neededWeight,
		totalWeight: totalWeight,
	};
};
mod.creepSize = function (flagRoomName, carry, setup) {
	if (!carry || carry < 0)
		return 0;

	const multiCarry = _.max([0, carry - 3]);
	const fixedBodyCost = Creep.bodyCosts(setup.fixedBody);
	const multiBodyCost = Creep.bodyCosts(setup.multiBody);
	const ret = fixedBodyCost + multiBodyCost * _.ceil(multiCarry * 0.5);

	// global.logSystem(flagRoomName, `behaviour: ${setup.behaviour}`);
	// global.logSystem(flagRoomName, `name: ${setup.name}`);
	// global.logSystem(flagRoomName, `multiCarry: ${_.ceil(multiCarry * 0.5)}`);
	// global.logSystem(flagRoomName, `fixedCost: ${fixedBodyCost}`);
	// global.logSystem(flagRoomName, `multiCost: ${multiBodyCost}`);
	// global.logSystem(flagRoomName, `return => creepSize: ${ret}`);


	return ret;
};

mod.strategies = {
	defaultStrategy: {
		name: `default-${mod.name}`,
	},
	reserve: {
		name: `reserve-${mod.name}`,
		spawnParams: function (flag, homeRoom) {
			const population = mod.carryPartsPopulation(flag.pos.roomName, homeRoom).ret;

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
			// const room = Game.rooms[roomName];
			return mod.setupCreep(roomName, (Room.isCenterNineRoom(roomName)) ? _.cloneDeep(global.Task.mining.creep.SKMiner) : _.cloneDeep(global.Task.mining.creep.miner));
		},
		shouldSpawn: function (minerCount, sourceCount) {
			return minerCount < sourceCount;
		},
	},
	remoteHauler: {
		name: `hauler-${mod.name}`,
		setup: function (roomName) {
			// const room = Game.rooms[roomName];
			return mod.setupCreep(roomName, (Room.isCenterNineRoom(roomName)) ? _.cloneDeep(global.Task.mining.creep.SKHauler) : _.cloneDeep(global.Task.mining.creep.remoteHauler));
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

			let memory = global.Task.mining.memory(flagRoomName);

			if (memory.storageRoomName) {
				return memory.storageRoomName;
			}

			// Otherwise, score it
			memory.storageRoomName = Room.closestSpawnRoomFor(flagRoomName).name;
			mod.storage(flagRoomName, memory.storageRoomName);
			return memory.storageRoomName;
		},
		getSpawnRoomName: function (flagRoomName, minWeight, fixedCost, behaviour) {

			let maxWeight = this.maxWeight(flagRoomName, false, false, false, false);

			let params = {
				targetRoom: flagRoomName,
				minEnergyAvailable: maxWeight,
				behaviour: behaviour,
			};

			let spawnRoom = Room.findSpawnRoom(params);
			if (_.isNull(spawnRoom))
				params = {
					targetRoom: flagRoomName,
					minEnergyCapacity: Math.min(minWeight, fixedCost),
					behaviour: behaviour,
				};
			spawnRoom = Room.findSpawnRoom(params);

			if (_.isNull(spawnRoom))
				global.logSystem(flagRoomName, `creep can not spawn with: ${global.json(params)}`);
			else
				return spawnRoom.name;
		},
		maxWeight: function (flagRoomName, homeRoomName, memory, ignorePopulation, ignoreQueue) {
			if (!homeRoomName) {
				homeRoomName = mod.strategies.remoteHauler.homeRoomName(flagRoomName);
			}
			if (!memory)
				memory = global.Task.mining.memory(flagRoomName);

			const existingHaulers = ignorePopulation ? [] : _.map(memory.running.remoteHauler, n => Game.creeps[n]);
			const queuedHaulers = ignoreQueue ? [] : _.union(memory.queued.remoteHauler, memory.spawning.remoteHauler);
			// const room = Game.rooms[flagRoomName];

			// TODO loop per-source, take pinned delivery for route calc
			// TODO needed carry + dropped / x

			const travel = global.Util.routeRange(homeRoomName, flagRoomName);
			const ept = global.Task.mining.strategies.remoteHauler.ept(flagRoomName);
			// carry = ept * travel * 2 * 50 / 50
			const validHaulers = _.filter(existingHaulers, c => !global.Task.mining.needsReplacement(c));
			const existingCarry = _.sum(validHaulers, c => (c && c.data && c.data.body) ? c.data.body.carry : mod.strategies.remoteHauler.setup(flagRoomName).fixedBody[CARRY]);
			const queuedCarry = _.sum(queuedHaulers, c => (c && c.body) ? c.body.carry : mod.strategies.remoteHauler.setup(flagRoomName).fixedBody[CARRY]);

			// const room = Game.rooms[flagRoomName];
			// let addedCarry = function () {
			// 	let flagRoom = Game.rooms[flagRoomName];
			// 	let dropped = flagRoom ? flagRoom.droppedResourcesAmount() : 0;
			// 	if (dropped > 500)
			// 		return Math.ceil(dropped / 1000);
			// 	else if (dropped === 0) {
			// 		// TODO count it
			// 		return -2;
			// 	}
			// 	return 0;
			// };

			// global.logSystem(flagRoomName, `addedCarry final: ${addedCarry()}`);

			// let neededCarry = ept * travel * 2 - existingCarry - queuedCarry + addedCarry();
			let neededCarry = ept * travel * 2 - existingCarry - queuedCarry;
			const maxWeight = mod.creepSize(flagRoomName, neededCarry, this.setup(flagRoomName));

			if (global.DEBUG && global.debugger(global.DEBUGGING.targetRoom, flagRoomName)) {
				global.logSystem(flagRoomName, `maxWeight: ${maxWeight} neededCarry: ${neededCarry} behaviour: ${this.setup(flagRoomName).fixedBody[HEAL] > 0 ? 'SKHauler' : 'remoteHauler'}`);
			}


			if (global.DEBUG && global.TRACE)
				global.trace('Task', {
					Task: mod.name, room: flagRoomName, homeRoom: homeRoomName,
					haulers: existingHaulers.length + queuedHaulers.length, ept, travel, existingCarry, queuedCarry,
					neededCarry, maxWeight, [mod.name]: 'maxWeight',
				});

			return maxWeight;
		},
		maxMulti: function (room) {
			let max = 7;
			let contSum = 0;
			if (room) {
				contSum += _.sum(room.structures.container.in, 'sum');
				contSum += _.sum(room.droppedResources, 'amount');
				max += Math.floor(contSum / 1000);
			}
			// TODO count 15 (max) in every MaxMulti (fixedBody.length - 50) / multiBody.length
			let ret = Math.min(max, 15);
			global.logSystem(room.name, `HAULER maxMulti: ${ret}`);
			return ret;
		},
	},
};
