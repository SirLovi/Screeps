'use strict';

let mod = {
	analyze() {

		if (!(global.CLEAN_ROOM_MEMORY.enabled || global.CLEAN_ROOM_MEMORY.roadConstructionTrace.enabled))
			return;

		this.cleanRoomMemory();

	},
	cleanRoomMemory() {

		let currentMemSize = global.round(RawMemory.get().length / 1024);

		const
			enabledMemorySize = global.CLEAN_ROOM_MEMORY.maxEnabledMemorySize,
			cleanUpApproved = currentMemSize >= enabledMemorySize,
			targetMemorySize = global.CLEAN_ROOM_MEMORY.targetMemorySize;

		if (cleanUpApproved && global.CLEAN_ROOM_MEMORY.enabled) {

			console.log(`CLEANING ROOMS MEMORY`);

			let cleanUp = mod.init();

			cleanUp.roomInterval = Game.time - cleanUp.roomLastRunTime;
			cleanUp.roomLastRunTime = Game.time;

			mod.clearRoomMemory();

			cleanUp.cleanedState = global.round(RawMemory.get().length / 1024);

			// not enough free memory => run roadTrace cleanUp
			if (cleanUp.cleanedState >= targetMemorySize && global.ROAD_CONSTRUCTION_ENABLE) {

				console.log(`not enough memory after clean rooms: ${cleanUp.dirtyState} -> ${cleanUp.cleanedState}`);
				console.log(`cleaning roadConstructionTrace:`);

				mod.clearRoadConst();
			}

			cleanUp.cleanPercentage = global.percentIncrease(cleanUp.cleanedState, cleanUp.dirtyState, 1);
			console.log(`Memory size after cleanUp: ${cleanUp.dirtyState} -> ${cleanUp.cleanedState}`);
		}

		const
			roadConstTiming = Game.time % global.CLEAN_ROOM_MEMORY.roadConstructionTrace.timing === 0,
			roadConstEnabled = global.CLEAN_ROOM_MEMORY.roadConstructionTrace.enabled && roadConstTiming && global.ROAD_CONSTRUCTION_ENABLE;

		if (roadConstEnabled && global.CLEAN_ROOM_MEMORY.roadConstructionTrace.enabled) {

			console.log(`CLEANING ROAD_CONSTRUCTION_TRACE MEMORY`);

			let cleanUp = mod.init();

			mod.clearRoadConst();

			cleanUp.cleanPercentage = global.percentIncrease(cleanUp.cleanedState, cleanUp.dirtyState, 1);
			console.log(`Memory size after cleanUp: ${cleanUp.dirtyState} -> ${cleanUp.cleanedState}`);
		}
	},
	init() {

		if (_.isUndefined(Memory.cleanUp))
			Memory.cleanUp = {
				roomLastRunTime: 0,
				roadLastRunTime: 0,
				roadInterval: 0,
				roomInterval: 0,
				dirtyState: 0,
				cleanedState: 0,
				increasePercentage: 0,
				cleanPercentage: 0,
				memoryOverload: 0,
			};

		let cleanUp = Memory.cleanUp;

		// count changes
		cleanUp.dirtyState = global.round(RawMemory.get().length / 1024);
		cleanUp.increasePercentage = global.percentIncrease(cleanUp.cleanedState, cleanUp.dirtyState, 1);
		cleanUp.memoryOverload = global.round(cleanUp.dirtyState * 100 / 2048, 1);


		console.log(`last memory size: ${cleanUp.cleanedState}`);
		console.log(`current memory size: ${cleanUp.dirtyState}`);
		console.log(`memory usage increased since last clean: ${cleanUp.increasePercentage}%`);
		console.log(`total memory usage: ${cleanUp.memoryOverload}%`);

		return cleanUp;

	},
	clearRoadConst() {

		let cleanUp = Memory.cleanUp;

		cleanUp.roadInterval = Game.time - cleanUp.roadLastRunTime;
		cleanUp.roadLastRunTime = Game.time;

		for (let room of myRooms)
			delete room.memory.roadConstructionTrace;

		cleanUp.cleanedState = global.round(RawMemory.get().length / 1024);

	},
	clearRoomMemory() {
		console.log(`rooms in Memory: ${Object.keys(Memory.rooms).length}`);
		Object.keys(Memory.rooms).forEach(room => {

			if (!global.ROAD_CONSTRUCTION_ENABLE && Memory.rooms[room].roadConstructionTrace)
				delete Memory.rooms[room].roadConstructionTrace;

			if (!global.SEND_STATISTIC_REPORTS && Memory.rooms[room].statistics)
				delete Memory.rooms[room].statistics;

			if (!global.GRAFANA && Memory.stats)
				delete Memory.stats;

			if (_.isUndefined(Game.rooms[room]) && room !== 'myTotalSites' && room !== 'myTotalStructures') {
				delete Memory.rooms[room];
			}
		});
		console.log(`rooms in Memory after cleanUp: ${Object.keys(Memory.rooms).length}`);
	},

};

module.exports = mod;
