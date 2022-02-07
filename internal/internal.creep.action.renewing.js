let action = new Creep.Action('renewing');
module.exports = action;
action.testCreep = function () {
	return 'remoteHauler-Flag90-1';
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
action.newTarget = function (creep) {

	let currentRoomName = creep.room.name;
	let room = Game.rooms[currentRoomName];
	let roomMemory = Memory.rooms[currentRoomName];
	let spawnRenewQueueMemory = Memory.tasks.mining[currentRoomName].spawnRenewQueue;
	let inHomeRoom = (room && room.my)

	if (!inHomeRoom) {
		global.logSystem(currentRoomName, `RENEWING IS SELECT NEW TARGET for ${creep.name} is INVALID (not my room), 'NEW_TARGET')`);
		global.logSystem(currentRoomName, `RENEWING creep.currentRoom: ${currentRoomName} creep.homeRoom: ${creep.data.homeRoom} !room.my: ${!!room || !room.my}`);

		return false;
	}

	let needToRenew = creep.data.ttl <= creep.data.predictedRenewal * 2;
	let finishedRenew = creep.data.ttl >= creep.data.predictedRenewal * 3;

	if (!needToRenew || finishedRenew) {
		global.logSystem(currentRoomName, `RENEWING IS SELECT NEW TARGET for ${creep.name} is INVALID (no need to renew), 'NEW_TARGET'`);
		return false;
	}

	global.logSystem(currentRoomName, `RENEWING IS SELECT NEW TARGET for ${creep.name}, 'NEW_TARGET'`);

	action.checkMemory(creep);


	let spawns = room.structures.spawns;
	let availableSpawns = _.filter(spawns, spawn => {
		// return !'spawning' in spawn;
		return !_.isNull('spawning' in spawn);
	});

	if (!availableSpawns) {
		console.log(`not available spawns`);
		if (roomMemory.spawnQueueHigh.length === 0 && roomMemory.spawnQueueMedium.length === 0 && roomMemory.spawnQueueLow.length === 0) {
			let firstAvailable = _.min(spawns, 'spawning.needTime');
			if (!spawnRenewQueueMemory[firstAvailable.name] || spawnRenewQueueMemory[firstAvailable.name].length === 0) {
				console.log(`firstAvailable spawn will be ${firstAvailable.name}`);
				return firstAvailable;
			}
		}
		return false;
	}

	// find closest spawn, should balance allocations
	return _.chain(availableSpawns).sortBy(function (spawn) {
		return creep.pos.getRangeTo(spawn) - spawn.store[RESOURCE_ENERGY] / 10 + (memory[spawn.name] ? memory[spawn.name].length * 10 : 0);
	}).first().value();
};
action.addToQueue = function (renewQueue, creep) {
	if (!renewQueue.includes(creep.name))
		renewQueue.push(creep.name);
};

action.removeFromQueue = function (renewQueue, creep) {

	function removeItem(arr, value) {
		let index = arr.indexOf(value);
		if (index > -1) {
			arr.splice(index, 1);
		}
		return arr;
	}

	if (renewQueue.includes(creep.name))
		removeItem(renewQueue, creep.name);

};
action.work = function (creep) {

	global.logSystem(creep.room.name, `RENEWING IS RUNNING for ${creep.name}`);

	let roomName = creep.room.name;
	let room = Game.rooms[roomName];
	let spawn = creep.target;
	let flee = false;
	let needToRenew = creep.data.ttl <= creep.data.predictedRenewal * 2;
	let finishedRenew = creep.data.ttl >= creep.data.predictedRenewal * 3;

	if (creep.room.name !== creep.data.homeRoom || !room.my) {
		global.logSystem(creep.room.name, `RENEWING for ${creep.name} is INVALID (not my room), 'WORK'`);
		return false;
	}

	if (!needToRenew || finishedRenew) {
		global.logSystem(creep.room.name, `RENEWING for ${creep.name} is INVALID (no need to renew), 'WORK'`);
		return false;
	}

	global.logSystem(creep.room.name, `RENEWING STARTED!!! ${creep.name} ttl: ${creep.data.ttl} needToRenew: ${needToRenew} time: ${Game.time}`);

	action.checkMemory(creep);

	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	// if (spawn.pos.y - 1 === creep.pos.y && creep.pos.x === spawn.pos.y && needToRenew) {
	// 	if (action.testCreep() === creep.name) {
	// 		console.log(`flee 1`);
	// 	}
	// 	flee = true;
	// }

	if (needToRenew) {
		action.addToQueue(renewQueue, creep);
		// step toward spawn and request renew
		if (spawn.pos.isNearTo(creep)) {
			if (_.first(renewQueue) === creep.name) {
				let ret = spawn.renewCreep(creep);
				if (ret === ERR_NOT_ENOUGH_ENERGY || ret === ERR_BUSY) {
					// if (action.testCreep() === creep.name) {
					console.log(`old target: ${creep.target}`);
					// }
					let retNewTarget = action.newTarget(creep);
					// if (action.testCreep() === creep.name)

					if (!retNewTarget) {
						console.log(`no new target for ${creep.name}`);
						action.removeFromQueue(renewQueue, creep);
						delete creep.target;
						delete creep.action;
						return false;
					}
					else {
						creep.target = retNewTarget;
						console.log(`getting new target: ${creep.target}`);
					}
				} else
					return global.translateErrorCode(ret) === OK;
			}
		} else {
			creep.move(creep.pos.getDirectionTo(spawn));
		}
	} else if (finishedRenew) {
		if (action.testCreep() === creep.name) {
			console.log(`flee 3`);
		}
		action.removeFromQueue(renewQueue, creep);
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
