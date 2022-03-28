let action = new Creep.Action('renewing');
module.exports = action;
action.threshold = (creep, start = true) => {
	if (global.RENEW[creep.data.creepType].renew) {
		if (start)
			return global.RENEW[creep.data.creepType].prMultiplier.start;
		else
			return global.RENEW[creep.data.creepType].prMultiplier.end;
	} else
		return 0;

};
action.needToRenew = (creep) => {
	return creep.data.ttl <= creep.data.predictedRenewal * action.threshold(creep) && creep.data.ttl > creep.data.predictedRenewal;
};
action.finishedRenew = (creep) => {
	return creep.data.ttl > creep.data.predictedRenewal * action.threshold(creep, false);
};
action.creepDataRenew = (creep) => {
	if (action.needToRenew(creep) && !creep.data.reNewing) {
		creep.data.reNewing = true;
	} else if (action.finishedRenew(creep) && creep.data.reNewing)
		creep.data.reNewing = false;
	else if (action.finishedRenew(creep))
		creep.data.reNewing = false;
};
action.isValidAction = function (creep) {

	// TODO add other creep types (worker, labTech)


	if (!global.RENEW[creep.data.creepType].renew)
		return false;

	let isValid = (maxHaulers, haulerCount, newBodyLength) => {

		let isnumberOfCreepsOk = maxHaulers >= haulerCount;
		let isBodyLengthOk = newBodyLength === creep.body.length;
		let typeValidation = isnumberOfCreepsOk && isBodyLengthOk;

		let ret = !creep.room.situation.invasion && typeValidation;

		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name)) {
			global.logSystem(creep.room.name, `${creep.name} RENEWING: VALID ACTION: maxHaulers: ${maxHaulers} currentHaulers: ${haulerCount}`);
			global.logSystem(creep.room.name, `${creep.name} RENEWING: VALID ACTION: newBodyLength: ${newBodyLength} currentBodyLength: ${creep.body.length}`);
			global.logSystem(creep.room.name, `${creep.name} RENEWING: VALID ACTION: ret: ${ret}`);

		}

		return ret;
	}


	let creepType = creep.data.creepType;

	if (creepType === 'hauler') {
		let newSetup = Creep.setup.hauler.RCL[creep.room.controller.level];
		let newBodyLength = newSetup.fixedBody.length + newSetup.multiBody.length * newSetup.maxMulti(creep.room);
		let haulerCount = creep.room.population.typeCount['hauler'];
		let maxHaulers = newSetup.maxCount(creep.room);

		return isValid(maxHaulers, haulerCount, newBodyLength);



	} else if (creepType === 'remoteHauler') {

		let newSetup = global.Task.mining.creep.remoteHauler
		let flagName = creep.data.destiny.targetName;
		let miningRoomName = Memory.flags[flagName].roomName;
		let miningRoom = Game.rooms[miningRoomName];
		let memory = global.Task.mining.memory(miningRoomName);
		let maxHaulers = global.Task.mining.getMaxHaulers(miningRoomName);
		let sourceCount = global.Task.mining.numberOfSource(miningRoomName);
		let maxMulti = global.Task.mining.strategies.remoteHauler.maxMulti(miningRoom, maxHaulers, sourceCount);
		let fixedBodyLength = global.Task.mining.countBody(newSetup.fixedBody, true);
		let multiBodyLength = global.Task.mining.countBody(newSetup.multiBody, true);
		let newBodyLength = fixedBodyLength + maxMulti * multiBodyLength;
		let flag = Game.flags[flagName];
		let haulerCount = global.Task.mining.count(miningRoomName, 'remoteHauler', memory, flag);

		return isValid(maxHaulers, haulerCount, newBodyLength);

	}

	return false;


};
action.isAddableAction = () => true;
action.isAddableTarget = () => true;
action.checkPrerequisites = (creep) => {

	// check Memory.rooms.roomName.spawnRenewQueue
	let roomName = creep.pos.roomName;
	let spawns = creep.room.structures.spawns;

	if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue)) {
		Memory.rooms[roomName].spawnRenewQueue = {};
		for (const spawn of spawns) {
			if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue[spawn.name]))
				Memory.rooms[roomName].spawnRenewQueue[spawn.name] = [];
		}
	}
	// add creep.data properties
	global.Task.predictedRenewal(creep);
	action.creepDataRenew(creep);

};
action.energyPrice = (creep) => {
	let creepCost = creep.data.bodyCost;
	if (_.isUndefined(creepCost))
		creepCost = creep.data.bodyCost = Creep.bodyCosts(creep.body, true);
	// TODO could it be undefined?

	return Math.ceil(creepCost / 2.5 / creep.body.length);

};
action.addToQueue = function (creep) {

	let roomName = creep.room.name;
	let spawn = creep.target;
	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	if (!renewQueue.includes(creep.name))
		renewQueue.push(creep.name);

	return renewQueue;
};
action.removeFromQueue = function (creep) {

	let roomName = creep.room.name;
	let spawn = creep.target;

	function removeItem(renewQueue, creepName) {
		let index = renewQueue.indexOf(creepName);
		if (index > -1) {
			renewQueue.splice(index, 1);
			return true;
		} else
			return false;
	}

	if (!spawn) {

		// if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
		// 	global.logSystem(creep.room.name, `${creep.name} RENEWING: NO SPAWN => removeQueue: ${creep.room.name}`);

		let renewQueue = Memory.rooms[roomName].spawnRenewQueue;

		for (let [spawn, queuedCreep] of Object.entries(renewQueue)) {

			let renewQueueSpawn = Memory.rooms[roomName].spawnRenewQueue[spawn];
			let currentCreep = queuedCreep[0];

			if (!currentCreep)
				continue;

			if (currentCreep === creep.name) {

				if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
					global.logSystem(creep.room.name, `${creep.name} RENEWING: NO SPAWN => Removing from removeQueue -> spawn: ${spawn} queuedCreep: ${currentCreep}`);

				let ret = removeItem(renewQueueSpawn, currentCreep);

				if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name)) {
					if (ret)
						global.logSystem(creep.room.name, `${currentCreep} RENEWING: NO SPAWN => Removed from removeQueue -> renewQueueSpawn: ${spawn}`);
					else
						global.logSystem(creep.room.name, `${currentCreep} RENEWING: NO SPAWN => no need to remove from removeQueue -> renewQueueSpawn: ${spawn}`);
				}
			}

		}
		creep.data.renewing = false;
		return;
	}

	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name]

	if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} RENEWING: Removing from removeQueue -> spawn: ${spawn.name} queuedCreep: ${creep.name}`);

	let ret = removeItem(renewQueue, creep.name);

	if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name)) {
		if (ret)
			global.logSystem(creep.room.name, `${creep.name} RENEWING: Removed from removeQueue -> renewQueueSpawn: ${spawn.name}`);
		else
			global.logSystem(creep.room.name, `${creep.name} RENEWING: no need to remove from removeQueue -> renewQueueSpawn: ${spawn.name}`);
	}
	creep.data.renewing = false;

};
action.newTarget = function (creep) {

	action.checkPrerequisites(creep);

	if (global.debugger(global.DEBUGGING.renewing, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} RENEWING: AT renewing.newTarget -> data.renewing: ${creep.data.reNewing}`);

	let currentRoomName = creep.room.name;

	if (!creep.data.reNewing) {
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(currentRoomName, `${creep.name} RENEWING: no need to renew => TTL: ${creep.data.ttl} reNewAt: ${creep.data.predictedRenewal * action.threshold(creep)}`);
		action.removeFromQueue(creep);
		return false;
	}

	if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
		global.logSystem(currentRoomName, `${creep.name} RENEWING: selecting targetSpawn for renew`);

	let isVaLidSpawn = (spawn) => {
		return _.isNull(spawn.spawning) && spawn.store[RESOURCE_ENERGY] >= action.energyPrice(creep) * 2
	}

	let oldTarget = creep.target;

	if (oldTarget && isVaLidSpawn(oldTarget)) {
		return oldTarget;
	} else {
		action.removeFromQueue(creep);
		let room = Game.rooms[currentRoomName];
		let spawns = room.structures.spawns;
		let roomMemory = Memory.rooms[currentRoomName];
		let spawnRenewQueueMemory = roomMemory.spawnRenewQueue;

		let availableSpawns = _.filter(spawns, spawn => {

			if (roomMemory.spawnQueueHigh.length === 0 && roomMemory.spawnQueueMedium.length === 0 && roomMemory.spawnQueueLow.length === 0)
				return isVaLidSpawn(spawn)
					&& (spawnRenewQueueMemory[spawn.name].length === 0 || spawnRenewQueueMemory[spawn.name][0] === creep.name);
			else
				return false;
		});

		if (availableSpawns.length === 0) {
			action.removeFromQueue(creep);
			if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
				global.logSystem(currentRoomName, `${creep.name} RENEWING: RENEWING: NO AVAILABLE SPAWN`);
			creep.data.renewing = false;
			return false;
		} else {
			let newTarget = _.chain(availableSpawns).sortBy(function (spawn) {
				return creep.pos.getRangeTo(spawn) - spawn.store[RESOURCE_ENERGY] / 10;
			}).first().value();

			if (isVaLidSpawn(newTarget)) {
				if (!oldTarget) {
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						global.logSystem(currentRoomName, `${creep.name} RENEWING: first target ${newTarget.name}`);
				} else if (oldTarget && newTarget.name !== oldTarget.name) {
					action.removeFromQueue(creep);
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						global.logSystem(currentRoomName, `${creep.name} RENEWING: new target ${newTarget.name}`);
				}
				return newTarget;
			} else {
				action.removeFromQueue(creep);
				return false;
			}
		}
	}
};
action.work = function (creep) {

	// if (!global.debugger(global.DEBUGGING.renewing, creep.room.name))
	// 	return false;
	let roomName = creep.room.name;
	// let room = Game.rooms[roomName];

	// let inMyRoom = room && room.my;

	action.checkPrerequisites(creep);

	if (global.debugger(global.DEBUGGING.renewing, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} RENEWING: AT renewing.newTarget -> data.renewing: ${creep.data.reNewing}`);

	let spawn = creep.target;
	let flee = false;
	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	if (creep.data.reNewing) {

		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} RENEWING: is RENEWING. TTL: ${creep.data.ttl}`);

		renewQueue = action.addToQueue(creep);

		// step toward spawn and request renew
		if (spawn.pos.isNearTo(creep)) {
			if (_.first(renewQueue) === creep.name) {
				let ret = spawn.renewCreep(creep);
				if (ret === ERR_NOT_ENOUGH_ENERGY || ret === ERR_BUSY) {
					// action.removeFromQueue(creep);
					// if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
					// 	global.logSystem(creep.room.name, `${creep.name} RENEWING: old target: ${creep.target}`);
					//
					// let retNewTarget = action.newTarget(creep);
					//
					// if (!retNewTarget) {
					// 	if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
					// 		global.logSystem(creep.room.name, `${creep.name} RENEWING: no new target for ${creep.name}`);
					// 	this.unassign(creep);
					// 	return false;
					// } else {
					// 	creep.target = retNewTarget;
					// 	if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
					// 		global.logSystem(creep.room.name, `${creep.name} RENEWING: getting new target: ${creep.target.name}`);
					// }
					action.removeFromQueue(creep);
					return false;
				} else if (ret === OK) {
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						global.logSystem(creep.room.name, `${creep.name} RENEWING: OK: ${creep.target.name}`);
					return OK;
				} else {
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						global.logSystem(creep.room.name, `${creep.name} RENEWING: ERROR: ${global.translateColorCode(ret)}`);
					action.removeFromQueue(creep);
					return false;
				}

			}
		} else {
			return creep.move(creep.pos.getDirectionTo(spawn))
		}
	} else {
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} RENEWING: finishedRenew: ${creep.target.name}`);
		action.removeFromQueue(creep);
		flee = true;
	}

	if (flee) {
		// step away from spawn
		if (spawn.pos.isNearTo(creep)) {
			creep.move((creep.pos.getDirectionTo(spawn) + 3 % 8) + 1);
		}
		return false;
	}

	// this.unassign(creep);
	// return false;
};
action.onAssignment = function (creep, target) {
	if (global.SAY_ASSIGNMENT)
		creep.say(global.ACTION_SAY.RENEWING, global.SAY_PUBLIC);
};
