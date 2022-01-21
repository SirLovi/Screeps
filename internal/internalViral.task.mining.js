let mod = {};
module.exports = mod;

mod.heal = function (roomName, partChange) {
	let memory = global.Task.mining.memory(roomName);
	memory.healSize = (memory.healSize || 0) + (partChange || 0);
	return `Task.${this.name}: healing capacity for ${roomName} ${memory.healSize >= 0 ? 'increased' : 'decreased'} to ${Math.abs(memory.healSize)} per miner.`;
};
mod.strategies = {
	miner: {
		setup: function (roomName) {
			return global.Task.mining.setupCreep(roomName, Room.isCenterNineRoom(roomName) ? global.Task.mining.creep.SKMiner : global.Task.mining.creep.miner);
		},
	},
	hauler: {
		setup: function (roomName) {
			return global.Task.mining.setupCreep(roomName, Room.isCenterNineRoom(roomName) ? global.Task.mining.creep.SKHauler : global.Task.mining.creep.hauler);
		},
		ept: function (roomName) {
			const room = Game.rooms[roomName];
			if (Room.isCenterNineRoom(roomName)) {
				return room ? 14 * room.sources.length : 42;
			} else {
				//FIXME: I would like to be able to call the base class of Task.mining here
				return room ? 10 * room.sources.length : 20;
			}
		},
	},
};
mod.creep = {
	SKMiner: {
		fixedBody: [MOVE, WORK, WORK, WORK, WORK, WORK],
		multiBody: [MOVE, MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, CARRY],
		maxMulti: 1,
		behaviour: 'remoteMiner',
		queue: 'Medium', // not much point in hauling or working without a miner, and they're a cheap spawn.
	},
	SKHauler: {
		fixedBody: {
			[CARRY]: 4,
			[MOVE]: 5,
			[WORK]: 1,
		},
		multiBody: [CARRY, MOVE],
		behaviour: 'remoteHauler',
		queue: 'Low',
	},
};
