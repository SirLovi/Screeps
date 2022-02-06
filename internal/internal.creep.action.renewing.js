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
action.newTarget = function (creep) {

	let roomName = creep.room.name;
	let memory = Memory.rooms[roomName].spawnRenewQueue;
	let spawns = creep.room.structures.spawns;
	let availableSpawns = _.filter(spawns, spawn => {
		return !'spawning' in spawn;
	});

	if (!availableSpawns) {
		console.log(`not available spawns`);
		if (memory.spawnQueueHigh.length === 0 && memory.spawnQueueMedium.length === 0 && memory.spawnQueueLow.length === 0) {
			let firstAvailable = _.min(spawns, 'spawning.needTime');
			if (!memory[firstAvailable.name] || memory[firstAvailable.name].length === 0) {
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
	// const ticks = creep.ticksToLive;
	let spawn = creep.target;
	let flee = false;
	let needToRenew = creep.data.ttl < creep.data.predictedRenewal * 2;
	let finishedRenew = creep.data.ttl >= creep.data.predictedRenewal * 3;

	global.logSystem(creep.room.name, `RENEWING ${creep.name} ttl: ${creep.data.ttl} needToRenew: ${needToRenew} time: ${Game.time}`);


	let roomName = creep.pos.roomName;
	if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue)) {
		Memory.rooms[roomName].spawnRenewQueue = {};
		if (_.isUndefined(Memory.rooms[roomName].spawnRenewQueue[spawn.name]))
			Memory.rooms[roomName].spawnRenewQueue[spawn.name] = [];
	}

	let renewQueue = Memory.rooms[roomName].spawnRenewQueue[spawn.name];

	if (spawn.pos.y - 1 === creep.pos.y && creep.pos.x === spawn.pos.y && needToRenew) {
		if (action.testCreep() === creep.name) {
			console.log(`flee 1`);
		}
		flee = true;
	}
	if (needToRenew) {
		action.addToQueue(renewQueue, creep);
		// step toward spawn and request renew
		if (spawn.pos.isNearTo(creep)) {
			if (_.first(renewQueue) === creep.name) {
				let ret = spawn.renewCreep(creep);
				if (ret === ERR_NOT_ENOUGH_ENERGY || ret === ERR_BUSY) {
					if (action.testCreep() === creep.name) {
						console.log(`old target: ${creep.target}`);
					}
					action.newTarget(creep);
					if (action.testCreep() === creep.name)
						console.log(`getting new target: ${creep.target}`);
					action.removeFromQueue(renewQueue, creep);
				}
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
	}
};

action.onAssignment = function (creep, target) {
	if (global.SAY_ASSIGNMENT)
		creep.say(global.ACTION_SAY.RENEWING, global.SAY_PUBLIC);
};
