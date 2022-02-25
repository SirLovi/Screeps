let action = new Creep.Action('renewing');
module.exports = action;
action.memory = (creep) => {
	return global.RENEW[creep.data.creepType]
}
action.isValidAction = function (creep) {
	return !creep.room.situation.invasion;
};
action.isAddableAction = () => true;
action.isAddableTarget = () => true;
action.checkMemory = (creep) => {

	let roomName = creep.pos.roomName;
	let spawns = creep.room.structures.spawns;

	if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue)) {
		Memory.rooms[roomName].spawnRenewQueue = {};
		for (const spawn of spawns) {
			if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue[spawn.name]))
				Memory.rooms[roomName].spawnRenewQueue[spawn.name] = [];
		}
	}
};
action.energyPrice = (creep) => {
	let creepCost = creep.data.bodyCost;
	if (_.isUndefined(creepCost))
		creepCost = creep.data.bodyCost = Creep.bodyCosts(creep.body, true);

	return Math.ceil(creepCost / 2.5 / creep.body.length);

};
action.newTarget = function (creep) {

	// if (!global.debugger(global.DEBUGGING.renewing, creep.room.name))
	// 	return false;

	action.checkMemory(creep);

	let currentRoomName = creep.room.name;
	let room = Game.rooms[currentRoomName];
	let roomMemory = Memory.rooms[currentRoomName];
	let spawnRenewQueueMemory = roomMemory.spawnRenewQueue;
	let inMyRoom = room && room.my;
	let oldTarget = creep.target;
	let newTarget;

	// global.logSystem(currentRoomName, `room.my: ${room.my} creep.data.homeRoom: ${creep.data.homeRoom}`);

	if (!inMyRoom) {
		global.logSystem(currentRoomName, `${creep.name} is not at Home, no renew`);
		return false;
	}

	let needToRenew = creep.data.ttl < creep.data.predictedRenewal * action.memory(creep).prMultiplier;

	if (!needToRenew) {
		global.logSystem(currentRoomName, `${creep.name} no need to renew`);
		return false;
	}

	global.logSystem(currentRoomName, `${creep.name} selecting target spawn for renew`);

	let spawns = room.structures.spawns;
	let availableSpawns = _.filter(spawns, spawn => {
		return _.isNull(spawn.spawning) && spawn.store[RESOURCE_ENERGY] >= action.energyPrice(creep) * 2 && spawnRenewQueueMemory[spawn.name].length <= 1;
	});

	if (availableSpawns.length === 0) {
		// console.log(`not available spawns`);
		availableSpawns = _.filter(spawns, spawn => {
			return spawn.store[RESOURCE_ENERGY] >= action.energyPrice(creep) * 2 && spawnRenewQueueMemory[spawn.name].length === 0;
		});
		if (availableSpawns.length === 0)
			return false;
		if (roomMemory.spawnQueueHigh.length === 0 && roomMemory.spawnQueueMedium.length === 0 && roomMemory.spawnQueueLow.length === 0) {
			newTarget = _.min(availableSpawns, 'spawning.remainingTime');
			if (newTarget.spawning.remainingTime + 20 > creep.data.ttl) {
				global.logSystem(currentRoomName, `NO AVAILABLE SPAWN for ${creep.name}, 'NEW_TARGET'`);
				return false;
			}
		}
	} else {
		// find closest spawn, should balance allocations
		newTarget = _.chain(availableSpawns).sortBy(function (spawn) {
			return creep.pos.getRangeTo(spawn) - spawn.store[RESOURCE_ENERGY] / 10 + spawnRenewQueueMemory[spawn.name].length;
		}).first().value();

		if (!oldTarget || newTarget.name !== oldTarget.name)
			return newTarget;
		else {
			global.logSystem(currentRoomName, `NO AVAILABLE SPAWN for ${creep.name}, 'NEW_TARGET'`);
			return false;
		}
	}
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
	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	function removeItem(arr, value) {
		let index = arr.indexOf(value);
		if (index > -1) {
			arr.splice(index, 1);
		}
	}

	if (renewQueue.includes(creep.name))
		removeItem(renewQueue, creep.name);

};
action.work = function (creep) {

	if (!global.debugger(global.DEBUGGING.renewing, creep.room.name))
		return false;
	let roomName = creep.room.name;
	let room = Game.rooms[roomName];
	let needToRenew = creep.data.ttl < creep.data.predictedRenewal * action.memory(creep).prMultiplier;
	let finishedRenew = creep.data.ttl >= creep.data.predictedRenewal * action.memory(creep).prMultiplier;
	// let inMyRoom = room && room.my;

	action.checkMemory(creep);

	let spawn = creep.target;
	let flee = false;
	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	// if (spawn.pos.y - 1 === creep.pos.y && creep.pos.x === spawn.pos.y && needToRenew) {
	// 	if (action.testCreep() === creep.name) {
	// 		console.log(`flee 1`);
	// 	}
	// 	flee = true;
	// }

	if (needToRenew) {
		global.logSystem(creep.room.name, `${creep.name} is RENEWING. TTL: ${creep.data.ttl}`);
		renewQueue = action.addToQueue(creep);
		// step toward spawn and request renew
		if (spawn.pos.isNearTo(creep)) {
			if (_.first(renewQueue) === creep.name) {
				let ret = spawn.renewCreep(creep);
				if (ret === ERR_NOT_ENOUGH_ENERGY || ret === ERR_BUSY) {
					action.removeFromQueue(creep);
					console.log(`old target: ${creep.target}`);
					let retNewTarget = action.newTarget(creep);

					if (!retNewTarget) {
						console.log(`no new target for ${creep.name}`);
						this.unassign(creep)
						return false;
					} else {
						creep.target = retNewTarget;
						console.log(`getting new target: ${creep.target.name}`);
					}
				} else
					return global.translateErrorCode(ret) === OK;
			}
		} else {
			creep.move(creep.pos.getDirectionTo(spawn));
		}
	} else if (finishedRenew) {
		console.log(`finishedRenew: ${creep.target.name}`);
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
