const mod = {};
module.exports = mod;
mod.analyzeRoom = function (room, needMemoryResync) {
	if (needMemoryResync) {
		room.saveMinerals();
	}
};
mod.extend = function () {

	Object.defineProperties(Room.prototype, {
		// 'resourcesStorage': {
		//     configurable: true,
		//     get() {
		//         if (_.isUndefined(this._resourcesStorage) || this._resourcesStorage.updated !== Game.time) {
		//
		//             this._resourcesStorage = {};
		//             this._resourcesStorage.updated = Game.time;
		//
		//             if (!_.isUndefined(this.storage)) {
		//                 Object.keys(this.storage.store).forEach(content => {
		//                     if (_.isUndefined(this.storage.store[content]))
		//                         this._resourcesStorage[content] = 0;
		//                     else
		//                         this._resourcesStorage[content] = this.storage.store[content];
		//                 });
		//             }
		//         }
		//         return this._resourcesStorage;
		//     }
		// },
		// 'resourcesTerminal': {
		//     configurable: true,
		//     get() {
		//         if (_.isUndefined(this._resourcesTerminal) || this._resourcesTerminal.updated !== Game.time) {
		//
		//             this._resourcesTerminal = {};
		//             this._resourcesTerminal.updated = Game.time;
		//
		//             if (!_.isUndefined(this.terminal)) {
		//                 Object.keys(this.terminal.store).forEach(content => {
		//                     if (_.isUndefined(this.terminal.store[content]))
		//                         this._resourcesTerminal[content] = 0;
		//                     else
		//                         this._resourcesTerminal[content] = this.terminal.store[content];
		//                 });
		//             }
		//
		//         }
		//         return this._resourcesTerminal;
		//     }
		// },
		// 'resourcesLabs': {
		//     configurable: true,
		//     get() {
		//         if (_.isUndefined(this._resourcesLabs)|| this._resourcesLabs.updated !== Game.time) {
		//
		//             this._resourcesLabs = {};
		//             this._resourcesLabs.updated = Game.time;
		//
		//             let data = this.memory.resources;
		//
		//             if (!_.isUndefined(data) && !_.isUndefined(data.lab)) {
		//
		//                 for (let lab of data.lab) {
		//                     if (lab.reactionState !== 'Storage') {
		//                         let labStructure = Game.getObjectById(lab.id),
		//                             mineralType = labStructure.mineralType,
		//                             mineralAmount = labStructure.mineralAmount;
		//
		//                         if (!_.isUndefined(mineralType)) {
		//                             if (_.isUndefined(this._resourcesLabs[mineralType]))
		//                                 this._resourcesLabs[mineralType] = mineralAmount;
		//                             else
		//                                 this._resourcesLabs[mineralType] += mineralAmount;
		//                         }
		//                     }
		//                 }
		//             }
		//         }
		//         return this._resourcesLabs;
		//     }
		// },
		'resourcesCreeps': {
			configurable: true,
			get() {
				if (_.isUndefined(this._resourcesCreeps)) {

					this._resourcesCreeps = {};

					for (let creep of this.creeps) {
						Object.keys(creep.carry).forEach(content => {
							if (_.isUndefined(this._resourcesCreeps[content]))
								this._resourcesCreeps[content] = creep.carry[content];
							else
								this._resourcesCreeps[content] += creep.carry[content];
						});
					}
				}
				return this._resourcesCreeps;
			},
		},
		'resourcesOffers': {
			configurable: true,
			get() {
				if (_.isUndefined(this._resourcesOffers)) {

					this._resourcesOffers = {};
					let data = this.memory.resources;

					if (!_.isUndefined(data) && !_.isUndefined(data.offers))
						this._resourcesOffers = global.sumCompoundType(data.offers);
				}
				return this._resourcesOffers;
			},
		},
		'resourcesOrders': {
			configurable: true,
			get() {
				if (_.isUndefined(this._resourcesOrders)) {

					this._resourcesOrders = {};
					let data = this.memory.resources;

					if (!_.isUndefined(data) && !_.isUndefined(data.orders))
						this._resourcesOrders = global.sumCompoundType(data.orders);
				}
				return this._resourcesOrders;
			},
		},
		'resourcesReactions': {
			configurable: true,
			get() {
				if (_.isUndefined(this._resourcesReactions)) {

					this._resourcesReactions = {};
					let data = this.memory.resources;

					if (!_.isUndefined(data) && !_.isUndefined(data.reactions) && !_.isUndefined(data.reactions.orders) && data.reactions.orders.length === 1) {

						let reaction = data.reactions,
							reactionOrders = reaction.orders[0];

						let compound = reactionOrders.type,
							amount = reactionOrders.amount,
							ingredientA = (global.LAB_REACTIONS[compound][0]),
							ingredientB = (global.LAB_REACTIONS[compound][1]),
							labSeedA = Game.getObjectById(reaction.seed_a),
							labSeedB = Game.getObjectById(reaction.seed_b),
							mineralAmountA = labSeedA.mineralAmount,
							mineralAmountB = labSeedB.mineralAmount;

						this._resourcesReactions[ingredientA] = Math.abs(amount - mineralAmountA) + this.resourcesCreeps[ingredientA] || 0;
						this._resourcesReactions[ingredientB] = Math.abs(amount - mineralAmountB) + this.resourcesCreeps[ingredientB] || 0;

					}
				}
				return this._resourcesReactions;
			},
		},
		'resourcesAll': {
			configurable: true,
			get() {
				if (_.isUndefined(this._resourcesAll)) {

					this._resourcesAll = {};

					if (!_.isUndefined(this.storage)) {
						Object.keys(this.storage.store).forEach(content => {
							if (_.isUndefined(this._resourcesAll[content]))
								this._resourcesAll[content] = this.storedMinerals(content);
						});
					}
					if (!_.isUndefined(this.terminal)) {
						Object.keys(this.terminal.store).forEach(content => {
							if (_.isUndefined(this._resourcesAll[content]))
								this._resourcesAll[content] = this.storedMinerals(content);
						});
					}
				}
				return this._resourcesAll;
			},
		},
		'droppedResources': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._droppedResources)) {
					this._droppedResources = this.find(FIND_DROPPED_RESOURCES);
				}
				return this._droppedResources;
			},
		},
		'tombStones': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._tombStones)) {
					this._tombStones = this.find(FIND_TOMBSTONES);
				}
				return this._tombStones;
			},
		},
		'ruins': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._ruins)) {
					this._ruins = this.find(FIND_RUINS);
				}
				return this._ruins;
			},
		},
		'minerals': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._minerals)) {
					this._minerals = [];
					let add = id => {
						global.addById(this._minerals, id);
					};
					_.forEach(this.memory.minerals, add);
				}
				return this._minerals;
			},
		},
		'mineralType': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.mineralType)) {
					let minerals = this.find(FIND_MINERALS);
					if (minerals && minerals.length > 0)
						this.memory.mineralType = minerals[0].mineralType;
					else this.memory.mineralType = '';
				}
				return this.memory.mineralType;
			},
		},
		'sources': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.sources) || this.name == 'sim') {
					this._sources = this.find(FIND_SOURCES);
					if (this._sources.length > 0) {
						this.memory.sources = this._sources.map(s => s.id);
					} else this.memory.sources = [];
				}
				if (_.isUndefined(this._sources)) {
					this._sources = [];
					let addSource = id => {
						addById(this._sources, id);
					};
					this.memory.sources.forEach(addSource);
				}
				return this._sources;
			},
		},
		'sourceAccessibleFields': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this.memory.sourceAccessibleFields)) {
					let sourceAccessibleFields = 0;
					let sources = this.sources;
					let countAccess = source => sourceAccessibleFields += source.accessibleFields;
					_.forEach(sources, countAccess);
					this.memory.sourceAccessibleFields = sourceAccessibleFields;
				}
				return this.memory.sourceAccessibleFields;
			},
		},
		'sourceEnergyAvailable': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._sourceEnergyAvailable)) {
					this._sourceEnergyAvailable = 0;
					let countEnergy = source => (this._sourceEnergyAvailable += source.energy);
					_.forEach(this.sources, countEnergy);
				}
				return this._sourceEnergyAvailable;
			},
		},
		'ticksToNextRegeneration': {
			configurable: true,
			get: function () {
				if (_.isUndefined(this._ticksToNextRegeneration)) {
					this._ticksToNextRegeneration = _(this.sources).map('ticksToRegeneration').min() || 0;
				}
				return this._ticksToNextRegeneration;
			},
		},
	});

	Room.prototype.resourcesAllButMe = function (compound) {
		// console.log(`empire: ${Memory.stats.empireMinerals[compound] || 0} room: ${this.resourcesAll[compound] || 0}`);
		return (Memory.stats.empireMinerals[compound] || 0) - (this.resourcesAll[compound] || 0);
	};

	Room.prototype.resourcesToAllocate = function (compound) {
		let empireResources = this.resourcesAllButMe(compound),
			numberOfAcceptedRooms = acceptedRooms.length - 1;

		if (global.isCompoundToManage(compound))
			empireResources -= Memory.compoundsManage[compound].roomThreshold * numberOfAcceptedRooms;

		empireResources = empireResources < 0 ? 0 : empireResources;

		return empireResources;

	};

	Room.prototype.saveMinerals = function () {
		let toPos = o => {
			return {
				x: o.pos.x,
				y: o.pos.y,
			};
		};
		let extractorPos = this.structures.all.filter(
			structure => structure.structureType === STRUCTURE_EXTRACTOR && structure.active,
		).map(toPos);
		let hasExtractor = m => _.some(extractorPos, {
			x: m.pos.x,
			y: m.pos.y,
		});
		const validMineral = this.find(FIND_MINERALS).filter(hasExtractor);
		// global.logSystem(this.name, `EXTRACTOR: ${validMineral.length}`);
		if (validMineral.length > 0) {
			let id = o => o.id;
			this.memory.minerals = _.map(validMineral, id);
		} else
			delete this.memory.minerals;
	};

	Room.prototype.droppedResourcesAmount = function (energy = false) {
		let dropped = this.droppedResources ? this.droppedResources : 0;
		if (_.isArray(dropped)) {
			if (energy)
				return _.sum(dropped, 'energy');
			else
				return _.sum(dropped, 'amount');
		}
		else
			return 0;

	}

	Room.prototype.resourcesToCarry = (energy = false) => {

	}


};
