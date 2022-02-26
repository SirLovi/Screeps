let action = new Creep.Action('renewing');
module.exports = action;
action.memory = (creep) => {
	return global.RENEW[creep.data.creepType]
}
action.isValidAction = function (creep) {
	return !creep.room.situation.invasion && creep.data.ttl < creep.data.predictedRenewal * action.memory(creep).prMultiplier;
};
action.isAddableAction = (creep) => {
	let renewCreep = global.RENEW[creep.data.creepType];
	return renewCreep.renew;
}
action.energyPrice = (creep) => {

	let creepCost = creep.data.bodyCost;
	if (_.isUndefined(creepCost))
		creepCost = creep.data.bodyCost = Creep.bodyCosts(creep.body, true);

	return Math.ceil(creepCost / 2.5 / creep.body.length);

};
action.isAddableTarget = (creep, target) => {
	return true;
}
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
	if (!creep.data.predictedRenewal)
		creep.data.predictedRenewal = creep.data.spawningTime;
};
action.newTarget = function (creep) {

	action.checkMemory(creep);

	let inMyRoom = creep.room && creep.room.my;
	if (!inMyRoom) {
		global.logSystem(creep.room.name, `${creep.name} is not at Home, no renew`);
		return false;
	}

	let currentRoomName = creep.room.name;
	let room = Game.rooms[currentRoomName];
	let roomMemory = Memory.rooms[currentRoomName];
	let spawnRenewQueueMemory = roomMemory.spawnRenewQueue;
	let oldTarget = creep.target;
	let newTarget;

	let spawns = room.structures.spawns;

	global.logSystem(creep.room.name, `creep: ${creep.name} spawns: ${spawns.length}`);


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

	let ttlThreshold = creep.data.predictedRenewal * action.memory(creep).prMultiplier;
	if (action.isAddableAction(creep) && action.isValidAction(creep)) {
		global.logSystem(creep.pos.roomName, `${creep.name} ttl: ${creep.data.ttl} renewal at: ${ttlThreshold} needToRenew: ${creep.data.ttl < ttlThreshold}`);
	} else {
		global.logSystem(creep.room.name, `${creep.name} no need to renew`);
	}


	let roomName = creep.room.name;
	// let room = Game.rooms[roomName];
	let needToRenew = creep.data.ttl < ttlThreshold;
	let finishedRenew = creep.data.ttl >= ttlThreshold;
	// let inMyRoom = room && room.my;

	action.checkMemory(creep);

	let spawn = creep.target;
	let flee = false;
	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

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
