const mod = {};
module.exports = mod;
mod.analyzeRoom = function (room, needMemoryResync) {
	if (needMemoryResync) {
		room.saveSpawns();
	}
};
mod.extend = function () {
	Object.defineProperties(Room.prototype, {
		'spawnQueueHigh': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.spawnQueueHigh)) {
					this.memory.spawnQueueHigh = [];
				}
				return this.memory.spawnQueueHigh;
			},
		},
		'spawnQueueMedium': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.spawnQueueMedium)) {
					this.memory.spawnQueueMedium = [];
				}
				return this.memory.spawnQueueMedium;
			},
		},
		'spawnQueueLow': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.spawnQueueLow)) {
					this.memory.spawnQueueLow = [];
				}
				return this.memory.spawnQueueLow;
			},
		},
	});

	Room.prototype.saveSpawns = function () {
		let spawns = this.find(FIND_MY_SPAWNS);
		if (spawns.length > 0) {
			let id = o => o.id;
			this.memory.spawns = _.map(spawns, id);
		} else delete this.memory.spawns;
	};

	Room.closestSpawnRoomFor = function (targetRoomName) {
		let range = room => global.Util.routeRange(room.name, targetRoomName);
		return _.min(myRooms, range);
	};

	// find a room to spawn
	// params: { targetRoom, minRCL = 0, maxRange = Infinity, minEnergyAvailable = 0, minEnergyCapacity = 0, callBack = null, allowTargetRoom = false, rangeRclRatio = 3, rangeQueueRatio = 51 }
	// requiredParams: targetRoom
	Room.findSpawnRoom = function (params) {
		if (!params || !params.targetRoom) return null;
		// filter validRooms
		let isValidRoom = room => (
			room.my &&
			(params.maxRange === undefined || global.Util.routeRange(room.name, params.targetRoom) <= params.maxRange) &&
			(params.minEnergyCapacity === undefined || params.minEnergyCapacity <= room.energyCapacityAvailable) &&
			(params.minEnergyAvailable === undefined || params.minEnergyAvailable <= room.energyAvailable) &&
			(room.name !== params.targetRoom || params.allowTargetRoom === true) &&
			(params.minRCL === undefined || room.controller.level >= params.minRCL) &&
			(params.callBack === undefined || params.callBack(room))
		);
		let validRooms = _.filter(myRooms, isValidRoom);
		if (validRooms.length === 0)
			return null;
		// select "best"
		let queueTime = queue => _.sum(queue, c => (c.parts.length * 3));
		let roomTime = room => ((queueTime(room.spawnQueueLow) * 0.9) + queueTime(room.spawnQueueMedium) + (queueTime(room.spawnQueueHigh) * 1.1)) / room.structures.spawns.length;
		let evaluation = room => {
			let weight = global.FIND_SPAWN_ROOM_WEIGHT;

			let distance = global.Util.routeRange(room.name, params.targetRoom) * weight.routeRange;
			let rcl = (8 - room.controller.level) / (params.rangeRclRatio || 3) * weight.rcl;
			let spawnTime = (roomTime(room)) * weight.roomTime;
			let energyAvailable = room.energyAvailable * weight.energyAvailable;
			let ret = distance + rcl + spawnTime - energyAvailable;

			// console.log(`targetRoom: ${params.targetRoom} spawnRoom: ${room.name}`);

			if (global.DEBUG && global.debugger(global.DEBUGGING.targetRoom, params.targetRoom)) {
				if (global.DEBUG && global.debugger(global.DEBUGGING.findSpawnRoom, room.name)) {
					global.logSystem(room.name, `targetRoom: ${params.targetRoom} distance: ${distance} rcl: ${rcl} spawnTime: ${spawnTime} energyAvailable: ${energyAvailable} ret: ${ret}`);
				}
			}

			return ret;
		};
		// console.log(validRooms);
		let ret = _.min(validRooms, evaluation);
		console.log(`retName: ${ret.name}, console: ${global.debugger(global.DEBUGGING.findSpawnRoom, ret.name)}`);
		if (global.DEBUG && global.debugger(global.DEBUGGING.findSpawnRoom, ret.name)) {
			if (!params.name && !params.behaviour)
				console.log(`not name or behaviour at ${ret.name} params: ${global.json(params)}`);
			global.logSystem(ret.name, `is the spawningRoom for ${params.behavior ? params.behaviour : params.name ? params.name : 'unknown'}`);

		}

		return ret;
	};
};
