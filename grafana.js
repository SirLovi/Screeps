let mod = {};

mod.run = function() {
    
    Memory.stats = { tick: Game.time };
    
    Memory.stats.cpu = Game.cpu;
    Memory.stats.cpu.used = Game.cpu.getUsed();
    Memory.stats.gcl = Game.gcl;
    Memory.stats.empireMinerals = {
        "H": 0,
        "O": 0,
        "L": 0,
        "K": 0,
        "Z": 0,
        "U": 0,
        "X": 0,
        "G": 0,
        "energy": 0,
        "power": 0,
        "ops": 0,
        "silicon": 0,
        "metal": 0,
        "biomass": 0,
        "mist": 0,
        "OH": 0,
        "ZK": 0,
        "UL": 0,
        "UH": 0,
        "UO": 0,
        "KL": 0,
        "KO": 0,
        "LH": 0,
        "LO": 0,
        "ZH": 0,
        "ZO": 0,
        "GH": 0,
        "GO": 0,
        "UH2O": 0,
        "UHO2": 0,
        "KH2O": 0,
        "KHO2": 0,
        "LH2O": 0,
        "LHO2": 0,
        "ZH2O": 0,
        "ZHO2": 0,
        "GH2O": 0,
        "GHO2": 0,
        "XUH2O": 0,
        "XUHO2": 0,
        "XKH2O": 0,
        "XKHO2": 0,
        "XLH2O": 0,
        "XLHO2": 0,
        "XZH2O": 0,
        "XZHO2": 0,
        "XGH2O": 0,
        "XGHO2": 0,
        "utrium_bar": 0,
        "lemergium_bar": 0,
        "zynthium_bar": 0,
        "keanium_bar": 0,
        "ghodium_melt": 0,
        "oxidant": 0,
        "reductant": 0,
        "purifier": 0,
        "battery": 0,
        "composite": 0,
        "crystal": 0,
        "liquid": 0,
        "wire": 0,
        "switch": 0,
        "transistor": 0,
        "microchip": 0,
        "circuit": 0,
        "device": 0,
        "cell": 0,
        "phlegm": 0,
        "tissue": 0,
        "muscle": 0,
        "organoid": 0,
        "organism": 0,
        "alloy": 0,
        "tube": 0,
        "fixtures": 0,
        "frame": 0,
        "hydraulics": 0,
        "machine": 0,
        "condensate": 0,
        "concentrate": 0,
        "extract": 0,
        "spirit": 0,
        "emanation": 0,
        "essence": 0
    };
    
    Memory.stats.market = {
        credits: Game.market.credits,
        numOrders: Game.market.orders ? Object.keys(Game.market.orders).length : 0,
    };
    
    // ROOMS
    Memory.stats.rooms = {};
    
    for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room) continue;
        if (!room.my) continue;
        Memory.stats.rooms[room.name] = {
            name: room.name,
            spawns: {},
            storage: {},
            terminal: {},
            minerals: {},
            sources: {},
        };
        
        mod.init(room, Memory.stats.rooms[room.name]);
    }
    
};

mod.init = function(room, object) {
    mod.controller(room, object);
    mod.energy(room, object);
    mod.spawns(room, object.spawns);
    mod.storage(room, object.storage);
    mod.terminal(room, object.terminal);
    mod.minerals(room, object.minerals);
    mod.sources(room, object.sources);
};

mod.controller = function(room, object) {
    if (room.controller) {
        object.controller = {
            level: room.controller.level,
            progress: room.controller.progress,
            progressTotal: room.controller.progressTotal,
        };
    }
};

mod.energy = function(room, object) {
    object.energy = {
        available: room.energyAvailable,
        capacityAvailable: room.energyCapacityAvailable,
    }
};

mod.spawns = function(room, object) {
    if (room.structures.spawns) {
        room.structures.spawns.forEach(spawn => {
            object[spawn.name] = {
                name: spawn.name,
                spawning: spawn.spawning !== null ? 1 : 0,
            };
        });
    }
};

mod.storage = function(room, object) {
    if (room.storage) {
        object.store = _.sum(room.storage.store);
        object.resources = {};
        Object.keys(room.storage.store).forEach(resource => object.resources[resource] = room.storage.store[resource]);
        Object.keys(room.storage.store).forEach(resource => Memory.stats.empireMinerals[resource] = (Memory.stats.empireMinerals[resource] + room.storage.store[resource]));
    }
};

mod.terminal = function(room, object) {
    if (room.terminal) {
        object.store = _.sum(room.terminal.store);
        object.resources = {};
        Object.keys(room.terminal.store).forEach(resource => object.resources[resource] = room.terminal.store[resource]);
        Object.keys(room.terminal.store).forEach(resource => Memory.stats.empireMinerals[resource] = (Memory.stats.empireMinerals[resource] + room.terminal.store[resource]));
    }
};

mod.minerals = function(room, object) {
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

mod.sources = function(room, object) {
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