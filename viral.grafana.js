'use strict';

let mod = {};

mod.run = function () {

	if (!global.GRAFANA || Game.time % global.GRAFANA_INTERVAL !== 0)
		return;

	Memory.stats = {
		tick: Game.time,
		population: Object.keys(Memory.population).length,
		empireMinerals: {},
		rooms: [],
		memory: global.round(RawMemory.get().length / 1024),
		cpu: Game.cpu,
		gcl: Game.gcl,
		market: {
			credits: Game.market.credits,
			numOrders: Game.market.orders ? Object.keys(Game.market.orders).length : 0,
		}
	};

	Memory.stats.cpu.used = Game.cpu.getUsed();


	// ROOMS

	let myRooms = _.filter(Game.rooms, {'my': true});

	for (let room of myRooms) {
		// Memory.stats.rooms[room.name] = {
		// 	name: room.name,
		// 	spawns: {},
		// 	storage: {},
		// 	terminal: {},
		// 	minerals: {},
		// 	sources: {},
		// };

		Memory.stats.rooms.push(room.name)
		mod.init(room);
	}
};

mod.init = function (room) {
	// mod.controller(room, object);
	// mod.storage(room, object.storage);
	mod.empireMineral(room);
	// mod.energy(room, object);
	// mod.spawns(room, object.spawns);
	// mod.terminal(room, object.terminal);
	// mod.minerals(room, object.minerals);
	// mod.sources(room, object.sources);
};

mod.controller = function (room, object) {
	if (room.controller) {
		object.controller = {
			level: room.controller.level,
			progress: room.controller.progress,
			progressTotal: room.controller.progressTotal,
		};
	}
};

mod.energy = function (room, object) {
	object.energy = {
		available: room.energyAvailable,
		capacityAvailable: room.energyCapacityAvailable,
	};

	Memory.stats.empireEnergy = Memory.stats.empireMinerals['energy'];

};
// TODO energy add from empireEnergy
mod.empireMineral = function (room) {
	if (room.storage && room.terminal) {
		for (const mineral in room.resourcesAll) {
			if (!Memory.stats.empireMinerals[mineral])
				Memory.stats.empireMinerals[mineral] = 0;
			Memory.stats.empireMinerals[mineral] += room.resourcesAll[mineral];
		}
	}
};

mod.storage = function (room, object) {
	if (room.storage) {
		object.store = _.sum(room.storage.store);
		object.resources = {};
		Object.keys(room.storage.store).forEach(resource => object.resources[resource] = room.storage.store[resource]);
	}

};

mod.spawns = function (room, object) {
	if (room.structures.spawns) {
		room.structures.spawns.forEach(spawn => {
			object[spawn.name] = {
				name: spawn.name,
				spawning: spawn.spawning !== null ? 1 : 0,
			};
		});
	}
};

mod.terminal = function (room, object) {
	if (room.terminal) {
		object.store = _.sum(room.terminal.store);
		object.resources = {};
		Object.keys(room.terminal.store).forEach(resource => object.resources[resource] = room.terminal.store[resource]);
	}
};

mod.minerals = function (room, object) {
	if (room.minerals) {
		room.minerals.forEach(mineral => object[mineral.id] = {
			id: mineral.id,
			density: mineral.density,
			mineralAmount: mineral.mineralAmount,
			mineralType: mineral.mineralType,
			ticksToRegeneration: mineral.ticksToRegeneration,
		});
	}
};

mod.sources = function (room, object) {
	if (room.sources) {
		room.sources.forEach(source => object[source.id] = {
			id: source.id,
			energy: source.energy,
			energyCapacity: source.energyCapacity,
			ticksToRegeneration: source.ticksToRegeneration,
		});
	}
};


module.exports = mod;
