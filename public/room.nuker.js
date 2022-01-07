'use strict';

let mod = {
	analyzeRoom(room, needMemoryResync) {
		if (needMemoryResync) {
			room.saveNuker();
		}
	},
	analyze() {
		this.launchNuke();
	},
	launchNuke() {

		let targetRoom = global.ENABLE_NUKERS_ATTACK.targetRoom,
			x = global.ENABLE_NUKERS_ATTACK.coordinates.x,
			y = global.ENABLE_NUKERS_ATTACK.coordinates.y,
			delay = Game.time + 500;

		if (Game.time < delay
			|| !global.ENABLE_NUKERS_ATTACK.enabled) {
			return false;
		}

		if (targetRoom.nukedEnds)
			delete Memory.numberOfNukesLaunched;

		let maxNukesLaunched = Memory.numberOfNukesLaunched === global.ENABLE_NUKERS_ATTACK.numberOfNukesToLaunch;

		if (maxNukesLaunched) {
			return false;
		}

		console.log(`automated nuking will be starting in ${delay - Game.time} ticks`);

		let target = new RoomPosition(x, y, targetRoom);

		let isAvailable = function (nuker, room, target) {
			// if (!nuker.isActive())
			//     return false;

			if (_.isUndefined(target.roomName)) {
				console.log(`targetRoom: ${targetRoom} not visible`);
			}

			if (nuker.store['energy'] < nuker.store.getCapacity('energy')) {
				console.log(`not enough energy to launch nuke! energy: ${nuker.energy} energyCapacity: ${nuker.energyCapacity}`);
				return false;
			}

			if (nuker.store['G'] < nuker.store.getCapacity('G')) {
				console.log(`not enough G to launch nuke! ghodium: ${nuker.store['G']} ghodiumCapacity: ${nuker.store.getCapacity('G')}`);
				return false;
			}

			if (Game.map.getRoomLinearDistance(room.name, target.roomName) > 10)
				return false;

			return nuker.cooldown <= 0;
		};

		for (const room of myRooms) {

			let nuker = room.structures.nukers.all[0];
			if (isAvailable(nuker, room, target)) {
				// console.log(`ROOM: ${room.name}`);
				// console.log(`target: ${target}`);

				let ret = nuker.launchNuke(target);
				if (ret === OK) {
					if (!Memory.numberOfNukesLaunched) {
						Memory.numberOfNukesLaunched = 1;
					} else {
						Memory.numberOfNukesLaunched += 1;
					}

					console.log(`NUKER STARTED: from ${room.name} to: ${targetRoom}`);
					delay = Game.time + global.ENABLE_NUKERS_ATTACK.timer;
					break;
				}
			}
		}
	},
};
mod.extend = function () {
	Room.Nuker = function (room) {
		this.room = room;
		Object.defineProperties(this, {
			'all': {
				configurable: true,
				get: function () {
					if (_.isUndefined(this._all)) {
						this._all = [];
						let add = entry => {
							let o = Game.getObjectById(entry.id);
							if (o) {
								_.assign(o, entry);
								this._all.push(o);
							}
						};
						_.forEach(this.room.memory.nukers, add);
					}
					return this._all;
				},
			},
		});
	};
	Room.prototype.saveNuker = function () {
		let nukers = this.find(FIND_MY_STRUCTURES, {
			filter: (structure) => (structure.structureType === STRUCTURE_NUKER),
		});
		if (nukers.length > 0) {
			this.memory.nukers = [];

			// for each entry add to memory ( if not contained )
			let add = (nuker) => {
				let nukerData = this.memory.nukers.find((l) => l.id === nuker.id);
				if (!nukerData) {
					this.memory.nukers.push({
						id: nuker.id,
					});
				}
			};
			nukers.forEach(add);
		} else delete this.memory.nukers;
	};
};

module.exports = mod;
