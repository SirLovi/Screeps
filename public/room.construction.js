const mod = {};
module.exports = mod;
mod.register = function () {
	Flag.found.on(flag => Room.roomLayout(flag));
	Flag.found.on(flag => Room.fortifyLayout(flag));
};
mod.forced = global.ROAD_CONSTRUCTION_FORCED_ROOMS[Game.shard.name] && global.ROAD_CONSTRUCTION_FORCED_ROOMS[Game.shard.name].indexOf(this.name) !== -1;
mod.analyzeRoom = function (room, needMemoryResync) {
	if (needMemoryResync) {
		room.processConstructionFlags();
	}



	room.roadConstruction();
	room.destroyUnusedRoads();
};
mod.extend = function () {

	// Construction related Room variables go here
	Room.roomLayoutArray = [
		[, , , , , STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION],
		[, , , STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_TOWER, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
		[, , STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
		[, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_TOWER, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
		[, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION],
		[STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_NUKER, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION],
		[STRUCTURE_ROAD, STRUCTURE_TOWER, STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_ROAD, STRUCTURE_POWER_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_ROAD, STRUCTURE_OBSERVER, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_ROAD],
		[STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_LINK, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION],
		[, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION],
		[, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_TOWER, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
		[, , STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
		[, , , STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_TOWER, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
		[, , , , , STRUCTURE_EXTENSION, STRUCTURE_ROAD, STRUCTURE_EXTENSION],
	];

	// Room property extensions go here
	Object.defineProperties(Room.prototype, {
		'constructionSites': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._constructionSites)) {
					this._constructionSites = this.find(FIND_CONSTRUCTION_SITES);
				}
				return this._constructionSites;
			},
		},
		'myConstructionSites': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._myConstructionSites)) {
					this._myConstructionSites = this.find(FIND_MY_CONSTRUCTION_SITES);
				}
				return this._myConstructionSites;
			},
		},
		'roadConstructionTrace': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.roadConstructionTrace)) {
					this.memory.roadConstructionTrace = {};
				}
				return this.memory.roadConstructionTrace;
			},
			set: function (value) {

			},
		},
		'roadDeconstructionTrace': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.roadDeconstructionTrace)) {
					this.memory.roadDeconstructionTrace = {};
				}
				return this.memory.roadDeconstructionTrace;
			},
			set: function (value) {

			},
		},
		'terrain': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._terrain)) {
					this._terrain = Game.map.getRoomTerrain(this.name);
				}
				return this._terrain;
			},

		},
	});

	Room.prototype.getBestConstructionSiteFor = function (pos, filter = null) {
		let sites;
		if (filter)
			sites = this.constructionSites.filter(filter);
		else
			sites = this.constructionSites;
		if (sites.length === 0)
			return null;
		let siteOrder = global.Util.fieldOrFunction(global.CONSTRUCTION_PRIORITY, this);
		let rangeOrder = site => {
			let order = siteOrder.indexOf(site.structureType);
			return pos.getRangeTo(site) + (order < 0 ? 100000 : (order * 100));
			//if( order < 0 ) return 100000 + pos.getRangeTo(site);
			//return ((order - (site.progress / site.progressTotal)) * 100) + pos.getRangeTo(site);
		};
		return _.min(sites, rangeOrder);
	};

	Room.prototype.traceMapping = function (construction = true) {
		if (construction) {
			return Object.keys(this.roadConstructionTrace).map(k => {
				return { // convert to [{key,n,x,y}]
					'n': this.roadConstructionTrace[k], // count of steps on x,y coordinates
					'x': k.charCodeAt(0) - 32, // extract x from key
					'y': k.charCodeAt(1) - 32, // extract y from key
				};
			});
		} else {
			return Object.keys(this.roadDeconstructionTrace).map(k => {
				return { // convert to [{key,n,x,y}]
					'n': this.roadDeconstructionTrace[k], // count of steps on x,y coordinates
					'x': k.charCodeAt(0) - 32, // extract x from key
					'y': k.charCodeAt(1) - 32, // extract y from key
				};
			});
		}
	};

	Room.prototype.roadConstruction = function (minDeviation = global.ROAD_CONSTRUCTION_MIN_DEVIATION) {


		if ((!global.ROAD_CONSTRUCTION_ENABLE && !mod.forced) || Game.time % global.ROAD_CONSTRUCTION_INTERVAL !== 0 || Memory.rooms.myTotalSites >= MAX_CONSTRUCTION_SITES)
			return;

		if (this.my && global.ROAD_CONSTRUCTION_DISABLED_FOR_CLAIMED_ROOMS)
			return;

		if (!mod.forced && _.isNumber(global.ROAD_CONSTRUCTION_ENABLE)) {

			if (!this.my && !this.myReservation && !this.isCenterNineRoom)
				return;

			if (this.my && global.ROAD_CONSTRUCTION_ENABLE > this.controller.level)
				return;

		}

		if (this.roadConstructionTrace && Object.keys(this.roadConstructionTrace).length > 0) {

			console.log(`road construction ON: ${this.name}`);

			// if (_.isUndefined(Memory.rooms.roomsToCheck))
			// 	Memory.rooms.roomsToCheck = Object.keys(Memory.rooms).length;

			let data = this.traceMapping();
			let min = Math.max(global.ROAD_CONSTRUCTION_ABS_MIN, (data.reduce((_sum, b) => _sum + b.n, 0) / data.length) * minDeviation);
			let max = _.max(data, 'n').n;

			if (max < min)
				return;

			// filtering manually placed structures/constructionSites
			data = data.filter(coord => {

				let availableSpot = () => {
					let structures = this.lookForAt(LOOK_STRUCTURES, coord.x, coord.y);
					let constructionSites = this.lookForAt(LOOK_CONSTRUCTION_SITES, coord.x, coord.y);
					// TODO OBSTACLES_OBJECT?
					return (structures.length === 0
							|| _.some(structures, 'structureType', STRUCTURE_RAMPART)
							|| _.some(structures, 'structureType', STRUCTURE_CONTAINER))
						&& !_.some(structures, 'structureType', STRUCTURE_ROAD)
						&& constructionSites.length === 0;
				};

				if (coord.n === max) {
					return availableSpot();
				} else {
					return false;
				}
			});


			// global.BB(data);

			// build roads on all most frequent used fields
			let setSite = pos => {

				if (Memory.rooms.myTotalSites >= MAX_CONSTRUCTION_SITES)
					return false;

				if (global.DEBUG)
					global.logSystem(this.name, `Constructing new road at ${pos.x}'${pos.y} (${pos.n} traces)`);

				let ret = this.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);

				if (ret === OK) {
					global.logSystem(this.name, `Constructing new road at ${pos.x}'${pos.y} was created successfully`);
					Memory.rooms.myTotalSites++;
				} else {
					global.logSystem(this.name, `Constructing new road at ${pos.x}'${pos.y} ERROR: ${global.translateErrorCode(ret)}`);
				}

			};

			this.countMySites();

			if (Memory.rooms.myTotalSites < MAX_CONSTRUCTION_SITES) {
				console.log(`MySites: ${Memory.rooms.myTotalSites} ROAD_CONSTRUCTION_ABS_MIN: ${min} ROAD_CONSTRUCTION_ABS_MAX: ${max}`);
				_.forEach(data, setSite);
			}

			// clear old data
			// this.roadConstructionTrace = {};
			delete this.memory.roadConstructionTrace;
		}
	};

	Room.prototype.destroyUnusedRoads = function () {

		if ((!global.ROAD_CONSTRUCTION_ENABLE && !mod.forced) || Game.time % global.ROAD_CONSTRUCTION_INTERVAL !== 0 || !this.my)
			return;

		if (this.my && global.ROAD_CONSTRUCTION_DISABLED_FOR_CLAIMED_ROOMS)
			return;

		// console.log(`destroy hits: ${global.ROAD_DESTROY_HITS}`);
		if (this.roadDeconstructionTrace && Object.keys(this.roadDeconstructionTrace).length > 0) {
			// console.log(`road DESTROYING ON: ${this.name}`);

			let data = this.traceMapping(false);

			let roads = this.roads;

			// build roads on all most frequent used fields
			let deleteRoads = road => {

				let visited = _.filter(data, trace => {
					return trace.x === road.pos.x && trace.y === road.pos.y;
				})

				if (visited.length === 0) {
					let ret = road.destroy();
					if (ret === OK)
						global.logSystem(this.name, `Destroy road at ${road.pos.x}'${road.pos.y} was successfully done`);
				}
			};

			_.forEach(roads, deleteRoads);
			delete this.memory.roadDeconstructionTrace;
		}
	};

	Room.prototype.processConstructionFlags = function () {

		// if (!this.my || !global.Util.fieldOrFunction(global.SEMI_AUTOMATIC_CONSTRUCTION, this))
		// 	return;

		if (!this.controller || !global.Util.fieldOrFunction(global.SEMI_AUTOMATIC_CONSTRUCTION, this))
			return;
		let sitesSize = _.size(Game.constructionSites);
		if (sitesSize >= 100)
			return;
		const LEVEL = this.controller.level;
		const POS = new RoomPosition(25, 25, this.name);
		const ARGS = [POS, true];

		const CONSTRUCT = (flag, type) => {
			if (sitesSize >= 100)
				return;
			if (!flag)
				return;

			const POS = new RoomPosition(flag.x, flag.y, flag.roomName);

			if (!POS)
				return;
			const sites = POS.lookFor(LOOK_CONSTRUCTION_SITES);

			if (sites && sites.length)
				return; // already a construction site
			const structures = POS.lookFor(LOOK_STRUCTURES).filter(s => !(s instanceof StructureRoad || s instanceof StructureRampart));
			if (structures && structures.length)
				return; // pre-existing structure here
			const r = POS.createConstructionSite(type);
			if (global.Util.fieldOrFunction(global.REMOVE_CONSTRUCTION_FLAG, this, type) && r === OK) {
				if (flag.name) {
					flag = Game.flags[flag.name];
					if (flag instanceof Flag)
						flag.remove();
				}
				sitesSize++;
			}
		};

		// Extensions
		let shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][LEVEL] - (this.structures.extensions.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_EXTENSION).length);
		if (shortAmount > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.extension, ...ARGS).splice(0, shortAmount).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_EXTENSION);
			});
		}

		// Spawns
		shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][LEVEL] - (this.structures.spawns.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_SPAWN).length);
		if (shortAmount > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.spawn, ...ARGS).splice(0, shortAmount).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_SPAWN);
			});
		}

		// Towers
		shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][LEVEL] - (this.structures.towers.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_TOWER).length);
		if (shortAmount > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.tower, ...ARGS).splice(0, shortAmount).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_TOWER);
			});
		}

		// Links
		shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_LINK][LEVEL] - (this.structures.links.all.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_LINK).length);
		if (shortAmount > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.link, ...ARGS).splice(0, shortAmount).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_LINK);
			});
		}

		// Labs
		shortAmount = CONTROLLER_STRUCTURES[STRUCTURE_LAB][LEVEL] - (this.structures.labs.all.length + _.filter(this.constructionSites, s => s.structureType === STRUCTURE_LAB).length);
		if (shortAmount > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.lab, ...ARGS).splice(0, shortAmount).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_LAB);
			});
		}

		// Storage
		if (!this.storage && CONTROLLER_STRUCTURES[STRUCTURE_STORAGE][LEVEL] > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.storage, ...ARGS).splice(0, 1).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_STORAGE);
			});
		}

		// Terminal
		if (!this.terminal && CONTROLLER_STRUCTURES[STRUCTURE_TERMINAL][LEVEL] > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.terminal, ...ARGS).splice(0, 1).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_TERMINAL);
			});
		}

		// Observer
		if (!this.structures.observer && CONTROLLER_STRUCTURES[STRUCTURE_OBSERVER][LEVEL] > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.observer, ...ARGS).splice(0, 1).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_OBSERVER);
			});
		}

		// Nuker
		if (!this.structures.nuker && CONTROLLER_STRUCTURES[STRUCTURE_NUKER][LEVEL] > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.nuker, ...ARGS).splice(0, 1).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_NUKER);
			});
		}

		// Power Spawn
		if (!this.structures.powerSpawn && CONTROLLER_STRUCTURES[STRUCTURE_POWER_SPAWN][LEVEL] > 0) {
			global.FlagDir.filter(global.FLAG_COLOR.construct.powerSpawn, ...ARGS).splice(0, 1).forEach(flag => {
				CONSTRUCT(flag, STRUCTURE_POWER_SPAWN);
			});
		}

		// Extractor
		if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][LEVEL] > 0) {
			const [mineral] = this.find(FIND_MINERALS);
			const extractor = mineral.pos.lookFor(LOOK_STRUCTURES);
			if (extractor.length && extractor[0] instanceof StructureExtractor)
				return;
			CONSTRUCT(mineral.pos, STRUCTURE_EXTRACTOR);
		}

		// Walls
		global.FlagDir.filter(global.FLAG_COLOR.construct.wall, ...ARGS).forEach(flag => {
			CONSTRUCT(flag, STRUCTURE_WALL);
		});

		// Ramparts
		global.FlagDir.filter(global.FLAG_COLOR.construct.rampart, ...ARGS).forEach(flag => {
			CONSTRUCT(flag, STRUCTURE_RAMPART);
		});

		// Roads
		global.FlagDir.filter(global.FLAG_COLOR.construct.road, ...ARGS).forEach(flag => {
			CONSTRUCT(flag, STRUCTURE_ROAD);
		});
	};


	// new Room methods go here
	Room.roomLayout = function (flag) {
		if (!Flag.compare(flag, global.FLAG_COLOR.command.roomLayout))
			return;
		flag = Game.flags[flag.name];
		const room = flag.room;
		if (!room)
			return;

		const layout = Room.roomLayoutArray;
		const constructionFlags = {
			[STRUCTURE_SPAWN]: global.FLAG_COLOR.construct.spawn,
			[STRUCTURE_TOWER]: global.FLAG_COLOR.construct.tower,
			[STRUCTURE_EXTENSION]: global.FLAG_COLOR.construct.extension,
			[STRUCTURE_LINK]: global.FLAG_COLOR.construct.link,
			[STRUCTURE_ROAD]: global.FLAG_COLOR.construct.road,
			[STRUCTURE_WALL]: global.FLAG_COLOR.construct.wall,
			[STRUCTURE_RAMPART]: global.FLAG_COLOR.construct.rampart,
			[STRUCTURE_STORAGE]: global.FLAG_COLOR.construct.storage,
			[STRUCTURE_TERMINAL]: global.FLAG_COLOR.construct.terminal,
			[STRUCTURE_NUKER]: global.FLAG_COLOR.construct.nuker,
			[STRUCTURE_POWER_SPAWN]: global.FLAG_COLOR.construct.powerSpawn,
			[STRUCTURE_OBSERVER]: global.FLAG_COLOR.construct.observer,
		};

		const [centerX, centerY] = [flag.pos.x, flag.pos.y];

		const failed = () => {
			flag.pos.newFlag(global.FLAG_COLOR.command.invalidPosition, 'NO_ROOM');
			flag.remove();
			return false;
		};

		for (let x = 0; x < layout.length; x++) {
			for (let y = 0; y < layout[x].length; y++) {
				const xPos = Math.floor(centerX + (x - layout.length / 2) + 1);
				const yPos = Math.floor(centerY + (y - layout.length / 2) + 1);

				if (xPos >= 50 || xPos < 0 || yPos >= 50 || yPos < 0)
					return failed();
				const pos = room.getPositionAt(xPos, yPos);
				const structureType = layout[x] && layout[x][y];
				let roomTerrain = Game.rooms[room.name].terrain.get(xPos, yPos);

				if (structureType && (pos.lookFor(LOOK_FLAGS).length === 0) && !(roomTerrain === TERRAIN_MASK_WALL)) {

					//global.logSystem(Room.name, `TEST Room.terrain: ${roomTerrain}`);

					//if (roomTerrain === TERRAIN_MASK_WALL)
					//	return failed();
					if (structureType === STRUCTURE_ROAD) {
						pos.newFlag(global.FLAG_COLOR.construct.road);
					} else {
						const flagColour = constructionFlags[structureType];
						pos.newFlag(flagColour);
					}
				}
			}
		}

		/*
		placed.forEach(f => {
			f.pos.newFlag(f.flagColour);
		});
		_.forEach(sites, p => {
			if (_.size(Game.constructionSites) >= 100)
				return false;
			p.createConstructionSite(STRUCTURE_ROAD);
		});
		*/

		flag.pos.newFlag(global.FLAG_COLOR.construct.storage);
		flag.remove();
	};

	Room.fortifyLayout = function (flag) {
		if (!Flag.compare(flag, global.FLAG_COLOR.command.fortifyLayout))
			return;
		flag = Game.flags[flag.name];
		const room = flag.room;
		if (!room)
			return;

		const [centerX, centerY] = [flag.pos.x, flag.pos.y];

		const failed = () => {
			flag.pos.newFlag(global.FLAG_COLOR.command.invalidPosition, 'NO_ROOM');
			flag.remove();
			return false;
		};

		const bunkerDiameter = 16;

		for (let x = 0; x <= bunkerDiameter; x++) {
			for (let y = 0; y <= bunkerDiameter; y++) {
				const xPos = Math.floor(centerX + (x - bunkerDiameter / 2));
				const yPos = Math.floor(centerY + (y - bunkerDiameter / 2));

				if (xPos >= 50 || xPos < 0 || yPos >= 50 || yPos < 0)
					return failed();

				if((x === 0 ) || (y === 0 ) || (x === bunkerDiameter ) || (y === bunkerDiameter )){
					const pos = room.getPositionAt(xPos, yPos);
					let roomTerrain = Game.rooms[room.name].terrain.get(xPos, yPos);

					if ((pos.lookFor(LOOK_FLAGS).filter(f => f.color === COLOR_BLUE || (f.color === COLOR_WHITE && f.secondaryColor === COLOR_GREY)).length === 0) && !(roomTerrain === TERRAIN_MASK_WALL) && ((x+y) % 2 === 0)) {
						pos.newFlag(global.FLAG_COLOR.construct.rampart);
					} else if ((pos.lookFor(LOOK_FLAGS).filter(f => f.color === COLOR_BLUE || (f.color === COLOR_WHITE && f.secondaryColor === COLOR_GREY)).length === 0) && !(roomTerrain === TERRAIN_MASK_WALL) && (pos.lookFor(LOOK_STRUCTURES).filter(f => f.structureType === STRUCTURE_ROAD).length > 0)){
						pos.newFlag(global.FLAG_COLOR.construct.rampart);
					} else if ((pos.lookFor(LOOK_FLAGS).filter(f => f.color === COLOR_BLUE || (f.color === COLOR_WHITE && f.secondaryColor === COLOR_GREY)).length === 0) && !(roomTerrain === TERRAIN_MASK_WALL)){
						pos.newFlag(global.FLAG_COLOR.construct.wall);
					}
				}
			}
		}
		flag.remove();
	};
};

