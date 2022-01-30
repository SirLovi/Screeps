'use strict';

let mod = {};

mod.run = function () {

    if (Game.time % global.GRAFANA_INTERVAL === 0) {
        mod.createRoomMemory();
    }

    if (!global.GRAFANA || Game.time % global.GRAFANA_INTERVAL !== 0)
        return;

    mod.createStatProperties();


    // ROOM STATS DATA

    for (let room of global.myRooms) {
        // Memory.stats.rooms[room.name] = {
        // 	name: room.name,
        // 	spawns: {},
        // 	storage: {},
        // 	terminal: {},
        // 	minerals: {},
        // 	sources: {},
        // };
        mod.init(room);
    }
};

mod.createRoomMemory = function () {

    console.log(`Create room memory`);

    // reset global.rooms properties
    delete global._acceptedRooms;
    delete global._myRooms;
    delete global._myRoomsName;

    if (_.isUndefined(Memory.stats)) {
        Memory.stats = {
            tick: Game.time,
            rooms: []
        };
    } else {
        Memory.stats.tick = Game.time;
        Memory.stats.rooms = [];
    }

    let myRooms = _.filter(Game.rooms, {'my': true});

    for (let room of myRooms)
        Memory.stats.rooms.push(room.name)

};

mod.createStatProperties = function (fromMain = false) {

    if (fromMain) {

        Object.assign(Memory.stats, {
            population: Object.keys(Memory.population).length,
            empireMinerals: {},
            memory: global.round(RawMemory.get().length / 1024),
            cpu: {
                tickLimit: Game.cpu.tickLimit,
                limit: Game.cpu.limit,
                bucketData: {
                    bucket: Game.cpu.bucket,
                    bucketFillIntervals: [Game.time, Game.time],
                    bucketFillTime: 0
                },
                shardLimits: Game.cpu.shardLimits,
                unlocked: Game.cpu.unlocked,
                used: Game.cpu.getUsed(),
            },
            gcl: Game.gcl,
            market: {
                credits: Game.market.credits,
                numOrders: Game.market.orders ? Object.keys(Game.market.orders).length : 0,
            }
        });
    } else if (!fromMain) {
        Memory.stats.population = Object.keys(Memory.population).length;
        Memory.stats.empireMinerals = {}
        Memory.stats.memory = global.round(RawMemory.get().length / 1024);
        Memory.stats.cpu.tickLimit = Game.cpu.tickLimit;
        Memory.stats.cpu.limit = Game.cpu.limit;
        // Memory.stats.cpu.bucketData.bucketFillIntervals = [];
        Memory.stats.cpu.bucketData.bucket = Game.cpu.bucket;
        Memory.stats.cpu.shardLimits = Game.cpu.shardLimits;
        Memory.stats.cpu.unlocked = Game.cpu.unlocked;
        Memory.stats.cpu.used = Game.cpu.getUsed();
        Memory.stats.gcl = Game.gcl
        Memory.stats.market.credits = Game.market.credits;
        Memory.stats.market.numOrders = Game.market.orders ? Object.keys(Game.market.orders).length : 0;


    }


}

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
