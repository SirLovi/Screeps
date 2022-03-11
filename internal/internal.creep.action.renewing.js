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
	return creep.data.ttl < creep.data.predictedRenewal * action.threshold(creep);
};
action.finishedRenew = (creep) => {
	return creep.data.ttl > creep.data.predictedRenewal * action.threshold(creep, false);
};
action.creepDataRenew = (creep) => {
	if (action.needToRenew(creep) && !creep.data.reNewing) {
		creep.data.reNewing = true;
	} else if (action.finishedRenew(creep) && creep.data.reNewing)
		creep.data.reNewing = false;
};
action.isValidAction = function (creep) {
	return !creep.room.situation.invasion;
};
action.isAddableAction = () => true;
action.isAddableTarget = () => true;
action.checkMemory = (creep) => {
	// create Memory.rooms.roomName.spawnRenewQueue
	let roomName = creep.pos.roomName;
	let spawns = creep.room.structures.spawns;

	if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue)) {
		Memory.rooms[roomName].spawnRenewQueue = {};
		for (const spawn of spawns) {
			if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue[spawn.name]))
				Memory.rooms[roomName].spawnRenewQueue[spawn.name] = [];
		}
	}
	//
	global.Task.predictedRenewal(creep);
	action.creepDataRenew(creep);

};
action.energyPrice = (creep) => {
	let creepCost = creep.data.bodyCost;
	if (_.isUndefined(creepCost))
		creepCost = creep.data.bodyCost = Creep.bodyCosts(creep.body, true);

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
		}
	}

	if (!spawn) {
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} RENEWING: NO SPAWN from removeQueue: ${creep.room.name}`);

		let renewQueue = Memory.rooms[roomName].spawnRenewQueue;

		// global.logSystem(creep.room.name, `${creep.name} RENEWING: NO SPAWN from removeQueue: ${global.json(renewQueue)}`);

		for (let [spawn, queuedCreep] of Object.entries(renewQueue)) {

			if (!queuedCreep.length)
				continue;

			console.log(`RENEWING: spawn: ${spawn} queuedCreep: ${queuedCreep.length}`);

			let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn];
			let currentCreep = queuedCreep[0];

			console.log(`RENEWING: queuedCreep: ${currentCreep}`);

			removeItem(renewQueue, queuedCreep[0]);
			if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, Game.creeps[queuedCreep[0]].room.name))
				global.logSystem(Game.creeps[queuedCreep[0]].room.name, `${queuedCreep[0]} RENEWING: removeQueue with no spawn: ${global.json(renewQueue)}`);

		}
		return;
	}

	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	global.logSystem(creep.room.name, `${creep.name} RENEWING: remove from queue: ${spawn}`);

	removeItem(renewQueue, creep.name);

};
action.newTarget = function (creep) {

	if (global.debugger(global.DEBUGGING.renewing, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} RENEWING: AT renewing.newTarget`);

	action.checkMemory(creep);

	let currentRoomName = creep.room.name;
	let room = Game.rooms[currentRoomName];
	let roomMemory = Memory.rooms[currentRoomName];
	let spawnRenewQueueMemory = roomMemory.spawnRenewQueue;
	let inMyRoom = room && room.my;
	let oldTarget = creep.target;

	// global.logSystem(currentRoomName, `room.my: ${room.my} creep.data.homeRoom: ${creep.data.homeRoom}`);

	if (!inMyRoom) {
		global.logSystem(currentRoomName, `${creep.name} RENEWING: is not at Home, no renew`);
		return false;
	}

	// let needToRenew = creep.data.ttl < creep.data.predictedRenewal * action.threshold(creep);

	if (!creep.data.reNewing) {
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(currentRoomName, `${creep.name} RENEWING: no need to renew => TTL: ${creep.data.ttl} reNewAt ${creep.data.predictedRenewal * action.threshold(creep)}`);
		// action.removeFromQueue(creep);
		return false;
	}
	if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
		global.logSystem(currentRoomName, `${creep.name} RENEWING: selecting target spawn for renew`);

	let spawns = room.structures.spawns;
	let availableSpawns = _.filter(spawns, spawn => {
		if (roomMemory.spawnQueueHigh.length === 0 && roomMemory.spawnQueueMedium.length === 0 && roomMemory.spawnQueueLow.length === 0)
			return _.isNull(spawn.spawning) && spawn.store[RESOURCE_ENERGY] >= action.energyPrice(creep) * 2 && spawnRenewQueueMemory[spawn.name].length === 0;
		else {
			return false;
		}
	});

	if (availableSpawns.length === 0) {
		action.removeFromQueue(creep);
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(currentRoomName, `${creep.name} RENEWING: RENEWING: NO AVAILABLE SPAWN`);
		return false;
	} else if (availableSpawns === 1) {
		action.removeFromQueue(creep);
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(currentRoomName, `${creep.name} RENEWING: new target ${availableSpawns[0].name}`);
		return availableSpawns[0];
	}


	// find best
	let newTarget = _.chain(availableSpawns).sortBy(function (spawn) {
		return creep.pos.getRangeTo(spawn) - spawn.store[RESOURCE_ENERGY] / 10;
	}).first().value();

	if (newTarget && (!oldTarget || newTarget.name !== oldTarget.name)) {
		action.removeFromQueue(creep);
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(currentRoomName, `${creep.name} RENEWING: new target ${newTarget.name}`);
		return newTarget;
	}
	// else {
	// 	if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
	// 		global.logSystem(currentRoomName, `${creep.name} RENEWING: NO AVAILABLE SPAWN`);
	// 	action.removeFromQueue(creep);
	// 	return false;
	// }

};
action.work = function (creep) {

	if (!global.debugger(global.DEBUGGING.renewing, creep.room.name))
		return false;
	let roomName = creep.room.name;
	let room = Game.rooms[roomName];

	// let inMyRoom = room && room.my;

	action.checkMemory(creep);

	let spawn = creep.target;
	let flee = false;
	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	// let needToRenew = creep.data.ttl < creep.data.predictedRenewal * action.threshold(creep);
	// let finishedRenew = creep.data.ttl > creep.data.predictedRenewal * action.threshold(creep, false);

	// if (spawn.pos.y - 1 === creep.pos.y && creep.pos.x === spawn.pos.y && needToRenew) {
	// 	if (action.testCreep() === creep.name) {
	// 		console.log(`flee 1`);
	// 	}
	// 	flee = true;
	// }

	if (creep.data.reNewing) {

		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} RENEWING: is RENEWING. TTL: ${creep.data.ttl}`);

		renewQueue = action.addToQueue(creep);

		// step toward spawn and request renew
		if (spawn.pos.isNearTo(creep)) {
			if (_.first(renewQueue) === creep.name) {
				let ret = spawn.renewCreep(creep);
				if (ret === ERR_NOT_ENOUGH_ENERGY || ret === ERR_BUSY) {
					action.removeFromQueue(creep);
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						console.log(`RENEWING: old target: ${creep.target}`);
					let retNewTarget = action.newTarget(creep);

					if (!retNewTarget) {
						if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
							console.log(`RENEWING: no new target for ${creep.name}`);
						this.unassign(creep);
						return false;
					} else {
						creep.target = retNewTarget;
						if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
							console.log(`RENEWING: getting new target: ${creep.target.name}`);
					}
				} else if (ret === OK) {
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						console.log(`RENEWING: OK: ${creep.target.name}`);
					return true;
				} else {
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						console.log(`RENEWING: ERROR: ${global.translateColorCode(ret)}`);
					action.removeFromQueue(creep);
					return false;
				}

			}
		} else {
			creep.move(creep.pos.getDirectionTo(spawn));
		}
	} else {
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			console.log(`RENEWING: finishedRenew: ${creep.target.name}`);
		action.removeFromQueue(creep);
		this.unassign(creep);
		flee = true;
	}

	if (flee) {
		// step away from spawn
		if (spawn.pos.isNearTo(creep)) {
			creep.move((creep.pos.getDirectionTo(spawn) + 3 % 8) + 1);
		}
		return false;
	}

	this.unassign(creep);
	return false;
};
action.onAssignment = function (creep, target) {
	if (global.SAY_ASSIGNMENT)
		creep.say(global.ACTION_SAY.RENEWING, global.SAY_PUBLIC);
};
