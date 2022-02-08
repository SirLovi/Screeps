let action = new Creep.Action('renewing');
module.exports = action;
action.testRoom = function () {
	// return 'E16S27';
	return '';
};
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

	if (creep.room.name !== action.testRoom())
		return false;

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
		global.logSystem(currentRoomName, `RENEWING IS SELECT NEW TARGET for ${creep.name} is INVALID (not my room), 'NEW_TARGET')`);
		return false;
	}

	let needToRenew = creep.data.ttl <= creep.data.predictedRenewal * 2;

	if (!needToRenew) {
		global.logSystem(currentRoomName, `RENEWING IS SELECT NEW TARGET for ${creep.name} is INVALID (no need to renew), 'NEW_TARGET'`);
		return false;
	}

	global.logSystem(currentRoomName, `RENEWING IS SELECT NEW TARGET for ${creep.name}, 'NEW_TARGET'`);

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

	if (creep.room.name !== action.testRoom())
		return false;

	global.logSystem(creep.room.name, `RENEWING IS RUNNING for ${creep.name}`);

	let roomName = creep.room.name;
	let room = Game.rooms[roomName];
	let needToRenew = creep.data.ttl <= creep.data.predictedRenewal * 2;
	let finishedRenew = creep.data.ttl >= creep.data.predictedRenewal * 3;
	let inMyRoom = room && room.my;

	if (!inMyRoom) {
		global.logSystem(creep.room.name, `RENEWING for ${creep.name} is INVALID (not my room), 'WORK'`);
		return false;
	}

	if (!needToRenew) {
		global.logSystem(roomName, `RENEWING IS SELECT NEW TARGET for ${creep.name} is INVALID (no need to renew), 'WORK'`);
		return false;
	} else if (finishedRenew) {
		global.logSystem(roomName, `RENEWING IS FINISHED for ${creep.name} 'WORK'`);
		return false;
	}

	global.logSystem(creep.room.name, `RENEWING STARTED!!! ${creep.name} time: ${Game.time}`);

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
		renewQueue = action.addToQueue(creep);
		// step toward spawn and request renew
		if (spawn.pos.isNearTo(creep)) {
			if (_.first(renewQueue) === creep.name) {
				let ret = spawn.renewCreep(creep);
				if (ret === ERR_NOT_ENOUGH_ENERGY || ret === ERR_BUSY) {
					console.log(`old target: ${creep.target}`);
					let retNewTarget = action.newTarget(creep);

					if (!retNewTarget) {
						console.log(`no new target for ${creep.name}`);
						action.removeFromQueue(creep);
						delete creep.target;
						delete creep.action;
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
		action.removeFromQueue(creep);
		flee = true;
	}

	if (flee) {
		// step away from spawn
		if (spawn.pos.isNearTo(creep)) {
			creep.move((creep.pos.getDirectionTo(spawn) + 3 % 8) + 1);
		}
		return true;
	}

	return false;
};

action.onAssignment = function (creep, target) {
	if (global.SAY_ASSIGNMENT)
		creep.say(global.ACTION_SAY.RENEWING, global.SAY_PUBLIC);
};
