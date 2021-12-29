const
	mod = {},
	Util = require('./util');
module.exports = mod;
mod.analyzeRoom = function (room, needMemoryResync) {
	if (needMemoryResync) {
		room.saveLabs();
	}
	if (room.structures.labs.all.length > 0)
		room.processLabs();
};
mod.extend = function () {
	// Labs constructor
	Room.Labs = function (room) {
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
						_.forEach(this.room.memory.labs, add);
					}
					return this._all;
				},
			},
			'storage': {
				configurable: true,
				get: function () {
					if (_.isUndefined(this._storage)) {
						this._storage = _.filter(room.memory.resources.lab, lab => {
							return lab.reactionState === 'Storage';
						});
					}
					return this._storage;
				},
			},
			'workLabs': {
				configurable: true,
				get: function () {
					if (_.isUndefined(this._workLabs)) {
						let data = this.room.memory.resources.reactions,
							seed_a = data.seed_a,
							seed_b = data.seed_b;

						this._workLabs = [];

						let add = entry => {
							if (entry.id === seed_a || entry.id === seed_b || entry.reactionState === 'Storage')
								return;
							let o = Game.getObjectById(entry.id);
							if (o) {
								_.assign(o, entry);
								this._workLabs.push(o);
							}
						};
						_.forEach(this.room.memory.resources.lab, add);

						// console.log(`data ${global.json(data)}`);

					}
					return this._workLabs;
				},
			},

		});
	};
	// Lab related Room variables go here

	// Room prototype extensions go here

	Room.prototype.autoRegisterLabs = function () {

		let data = this.memory.resources,
			numberOfLabs = this.structures.labs.all.length;

		if (numberOfLabs === 3 && !global.MAKE_REACTIONS_WITH_3LABS)
			return;

		if (_.isUndefined(data))
			return;

		// create Memory object
		if (!_.isUndefined(data) && _.isUndefined(data.seedCheck))
			data.seedCheck = {
				numberOfLabs: numberOfLabs,
				flowerRegisterChecked: false,
			};
		// fill new labs with energy
		if (data.seedCheck.numberOfLabs !== numberOfLabs)
			_.values(Game.structures).filter(i => i.structureType === 'lab' && i.room.name === this.name).map(i => i.room.setStore(i.id, RESOURCE_ENERGY, 2000));

		// if some labs are registered, check if it is ok, register otherwise
		if (data && data.reactions && data.reactions.seed_a && data.reactions.seed_b) {

			if ((data.seedCheck.numberOfLabs !== numberOfLabs && (numberOfLabs === 3 || numberOfLabs === 6 || numberOfLabs === 10)) || !data.seedCheck.flowerRegisterChecked) {
				if (this.flowerRegisterCheck()) {
					data.seedCheck.numberOfLabs = numberOfLabs;
					data.seedCheck.flowerRegisterChecked = true;
					global.logSystem(this, `room labs correctly registered. flowerRegisterChecked: true`);
				} else if (numberOfLabs === 3 || numberOfLabs === 6 || numberOfLabs === 10) {
					global.logSystem(this, `room labs are under registration`);
					Util.resetBoostProduction(this.name);
					this.registerFlower();
				}
			}
		}
		// no seeds are registered
		else if (numberOfLabs === 3 || numberOfLabs === 6 || numberOfLabs === 10) {
			global.logSystem(this, `room labs are under registration`);
			Util.resetBoostProduction(this.name);
			this.registerFlower();
		}
	};

	Room.prototype.flowerRegisterCheck = function () {

		let data = this.memory.resources,
			numberOfLabs = this.structures.labs.all.length,
			seed_a = Game.getObjectById(data.reactions.seed_a),
			seed_b = Game.getObjectById(data.reactions.seed_b),
			counter = 0;

		for (let lab of this.structures.labs.all) {
			if (lab.id === seed_a.id || lab.id === seed_b.id)
				continue;
			if (lab.pos.inRangeTo(seed_a, 2) && lab.pos.inRangeTo(seed_b, 2))
				counter++;
		}

		return counter === numberOfLabs - 2;

	};

	Room.prototype.registerFlower = function () {

		let that = this,
			findSeed = function () {
				let seeds = [],
					counter = 0,
					labs = that.structures.labs.all,
					numberOfLabs = labs.length;

				for (let seedCandidate of labs) {
					for (let lab of labs) {
						if (lab.id === seedCandidate.id)
							continue;
						if (lab.pos.inRangeTo(seedCandidate, 2))
							counter++;
					}
					if (counter === numberOfLabs - 1)
						seeds.push(seedCandidate.id);
					counter = 0;
				}
				return seeds;
			},
			seeds = findSeed();

		if (seeds.length >= 2) {
			this.registerReactorFlower(seeds[0], seeds[1]);
			global.logSystem(this, `auto-registering reactor flower SUCCEED`);
			global.logSystem(this, `seeds are: `);
			global.logSystem(this, `${seeds[0]}, ${seeds [1]}`);
		} else {
			global.logSystem(this, `auto-registering reactor flower FAILED`);
			global.logSystem(this, `possible seeds are:`);
			global.BB(seeds);
		}
	};

	Room.prototype.registerReactorFlower = function (seed_a_id, seed_b_id) {
		if (this.memory.resources === undefined) {
			this.memory.resources = {
				lab: [],
				container: [],
				terminal: [],
				storage: [],
			};
		}
		if (this.memory.resources.powerSpawn === undefined)
			this.memory.resources.powerSpawn = [];

		let seed_a = Game.getObjectById(seed_a_id);
		let seed_b = Game.getObjectById(seed_b_id);
		if (!seed_a || !seed_b || seed_a.structureType !== STRUCTURE_LAB || seed_b.structureType !== STRUCTURE_LAB)
			return ERR_INVALID_TARGET;

		let data = this.memory.resources;
		if (data.reactions === undefined)
			data.reactions = {
				orders: [],
			};
		data.reactions.reactorType = global.REACTOR_TYPE_FLOWER;
		data.reactions.reactorMode = global.REACTOR_MODE_IDLE;
		data.reactions.seed_a = seed_a_id;
		data.reactions.seed_b = seed_b_id;

		let data_a = data.lab.find(l => l.id === seed_a_id);
		if (data_a) {
			data_a.reactionState = global.LAB_SEED;
		}

		let data_b = data.lab.find(l => l.id === seed_b_id);
		if (data_b) {
			data_b.reactionState = global.LAB_SEED;
		}

		return OK;
	};

	Room.prototype.saveLabs = function () {
		let labs = this.find(FIND_MY_STRUCTURES, {
			filter: (structure) => (structure.structureType === STRUCTURE_LAB),
		});
		if (labs.length > 0) {
			this.memory.labs = [];
			let storageLabs = this.storage ? this.storage.pos.findInRange(labs, 2).map(l => l.id) : [];

			this.memory.labs = [];

			// for each entry add to memory ( if not contained )
			let add = (lab) => {
				let labData = this.memory.labs.find((l) => l.id === lab.id);
				if (!labData) {
					this.memory.labs.push({
						id: lab.id,
						storage: storageLabs.includes(lab.id),
					});
				}
			};
			labs.forEach(add);
		} else delete this.memory.labs;
	};

	Room.prototype.processLabs = function () {
		// only process labs every 10 turns and avoid room tick
		let labs = this.find(FIND_MY_STRUCTURES, {
			filter: (s) => {
				return s.structureType === STRUCTURE_LAB;
			},
		});
		let data = this.memory.resources;
		if (!data)
			return;
			

		let timing;

		if (!data.reactions || data.reactions.orders.length === 0 || data.boostTiming.roomState !== 'reactionMaking')
			timing = Game.time % 10 !== 5;
		else
			timing = Game.time % REACTION_TIME[data.reactions.orders[0].type] === 0;

		if (!timing)
			return;
		// run basic reactions
		let master_labs = labs.filter((l) => {
			let data = this.memory.resources.lab.find((s) => s.id === l.id);
			return data ? (data.slave_a && data.slave_b) : false;
		});
		for (let i = 0; i < master_labs.length; i++) {
			// see if the reaction is possible
			let master = master_labs[i];
			if (master.cooldown > 0)
				continue;
			let data = data.lab.find((s) => s.id === master.id);
			if (!data)
				continue;
			let compound = data.reactionType;
			if (master.mineralAmount > 0 && master.mineralType !== compound)
				continue;
			let slave_a = Game.getObjectById(data.slave_a);
			let slave_b = Game.getObjectById(data.slave_b);
			if (!slave_a || slave_a.mineralType !== global.LAB_REACTIONS[compound][0]
				|| !slave_b || slave_b.mineralType !== global.LAB_REACTIONS[compound][1])
				continue;

			if (master.runReaction(slave_a, slave_b) === OK) {
				data.reactionAmount -= LAB_REACTION_AMOUNT;
				if (global.DEBUG && global.TRACE)
					global.trace('Room', {roomName: this.name, actionName: 'processLabs', labId: master.id, resourceType: compound, amountRemaining: data.reactionAmount});
				if (data.reactionAmount <= 0) {
					this.cancelReactionOrder(master.id);
				}
			}
		}

		// run reactors
		let reactions = data.reactions;
		if (!reactions)
			return;

		if (reactions.reactorType === global.REACTOR_TYPE_FLOWER)
			this.processReactorFlower();

		// switch (reactions.reactorType) {
		// 	case REACTOR_TYPE_FLOWER:
		// 		this.processReactorFlower();
		// 		break;
		// 	default:
		// 		break;
		// }
	};

	Room.prototype.processReactorFlower = function () {
		let data = this.memory.resources.reactions;
		if (!data || data.reactorType !== global.REACTOR_TYPE_FLOWER)
			return;

		// find and qualify reaction order
		// for (let i = 0; i < data.orders.length; i++) {
		// 	if (data.orders[i].amount < LAB_REACTION_AMOUNT) {
		// 		data.orders.splice(i--, 1);
		// 	} else {
		// 		break;
		// 	}
		// }

		if (data.orders[0] && data.orders[0].amount < LAB_REACTION_AMOUNT)
			data.orders = [];

		if (data.orders.length === 0) {
			// reset labs so they get emptied
			let labs = this.find(FIND_MY_STRUCTURES, {
				filter: (s) => {
					return s.structureType === STRUCTURE_LAB;
				},
			});
			for (let i = 0; i < labs.length; i++) {
				let lab = labs[i];
				let data = this.memory.resources.lab.find(s => s.id === lab.id);
				if (data && (data.reactionState === global.LAB_IDLE || data.reactionState === global.LAB_SEED)) {
					this.cancelReactionOrder(lab.id);
				}
			}
			data.reactorMode = global.REACTOR_MODE_IDLE;
			return;
		}
		let order = data.orders[0];
		data.reactorMode = order.mode;

		// switch (data.reactorMode) {
		// 	case REACTOR_MODE_BURST:
		// 		this.processReactorFlowerBurst();
		// 		break;
		// 	default:
		// 		break;
		// }

		if (data.reactorMode === global.REACTOR_MODE_BURST)
			this.processReactorFlowerBurst();

	};

	Room.prototype.processReactorFlowerBurst = function () {
		let data = this.memory.resources.reactions;

		if (!data || data.reactorType !== global.REACTOR_TYPE_FLOWER || data.reactorMode !== global.REACTOR_MODE_BURST)
			return false;

		if (!global.MAKE_REACTIONS_WITH_3LABS && this.memory.resources.lab.length <= 3)
			return false;

		let seed_a = Game.getObjectById(data.seed_a);
		let seed_b = Game.getObjectById(data.seed_b);

		if (!seed_a || !seed_b)
			return false;

		let order = data.orders[0];
		if (order.mode !== global.REACTOR_MODE_BURST)
			return false;

		let component_a = global.LAB_REACTIONS[order.type][0];
		let component_b = global.LAB_REACTIONS[order.type][1];


		// find and configure idle labs
		let labs = this.find(FIND_MY_STRUCTURES, {
			filter: (s) => {
				return s.structureType === STRUCTURE_LAB;
			},
		});
		let reactors = labs.filter(l => {
			let data = this.memory.resources.lab.find(s => s.id === l.id);
			let reactions = this.memory.resources.reactions;
			return data ? data.reactionState === global.LAB_IDLE && (data.id !== reactions.seed_a || data.id !== reactions.seed_b) : true;
		});
		for (let i = 0; i < reactors.length; i++) {
			let reactor = reactors[i];
			let data = this.memory.resources.lab.find(s => s.id === reactor.id);
			if (!data) {
				this.prepareReactionOrder(reactor.id, order.type, order.amount);
				data = this.memory.resources.lab.find(s => s.id === reactor.id);
			}
			if (data)
				data.reactionType = order.type;
		}

		// verify ability to run reactor
		if (seed_a.mineralType !== component_a || seed_b.mineralType !== component_b)
			return false;
		let maxReactions = Math.floor(Math.min(seed_a.mineralAmount, seed_b.mineralAmount, order.amount) / LAB_REACTION_AMOUNT);
		if (maxReactions === 0)
			return false;

		// run reactions
		let burstReactors = 0;
		for (let i = 0; i < reactors.length; i++) {
			let reactor = reactors[i];
			if (reactor.cooldown > 0)
				continue;
			if (reactor.mineralAmount === 0 || (reactor.mineralType === order.type && reactor.mineralAmount <= reactor.mineralCapacity - LAB_REACTION_AMOUNT && burstReactors < maxReactions)) {
				burstReactors++;
				// FU - SION - HA !
				let returnValue = reactor.runReaction(seed_a, seed_b);
				if (returnValue === OK) {
					order.amount -= LAB_REACTION_AMOUNT;
					if (global.DEBUG && global.TRACE)
						global.trace('Room', {roomName: this.name, actionName: 'processLabs', reactorType: REACTOR_TYPE_FLOWER, labId: reactor.id, resourceType: order.type, amountRemaining: order.amount});

				} else {
					global.logSystem(this.name, `${this.name} runReactions not OK. returnValue: ${global.translateErrorCode(returnValue)}`);
					return false;
				}
			}
		}
	};

	Room.prototype.cancelReactionOrder = function (labId, dataFilter) {
		let labData = this.memory.resources.lab.find((l) => l.id === labId);
		if (dataFilter && !_.matches(dataFilter)(labId))
			return;

		if (labData) {
			// clear slave reaction orders
			if (labData.slave_a)
				this.cancelReactionOrder(labData.slave_a, {master: labId});
			if (labData.slave_b)
				this.cancelReactionOrder(labData.slave_b, {master: labId});

			// clear reaction orders
			let basicStates = [global.LAB_MASTER, global.LAB_SLAVE_1, global.LAB_SLAVE_2, global.LAB_SLAVE_3];
			if (basicStates.includes(labData.reactionState))
				labData.reactionState = global.LAB_IDLE;
			delete labData.reactionType;
			delete labData.reactionAmount;
			delete labData.master;
			delete labData.slave_a;
			delete labData.slave_b;

			// if (this.memory.resources === undefined) {
			// 	this.memory.resources = {
			// 		lab: [],
			// 		container: [],
			// 		terminal: [],
			// 		storage: [],
			// 	};
			// }
			// if (this.memory.resources.orders === undefined) {
			// 	this.memory.resources.orders = [];
			// }

			// clear local resource orders
			for (let i = 0; i < labData.orders.length; i++) {
				let order = labData.orders[i];
				if (order.type === RESOURCE_ENERGY)
					continue;
				if (order.storeAmount > 0) {
					order.orderAmount = 0;
					order.orderRemaining = 0;
				} else if (order.orderAmount === 0 && order.orderRemaining === 0){
					labData.orders.splice(i--, 1);
				}
			}
		}

		return OK;
	};

	Room.prototype.prepareReactionOrder = function (labId, resourceType, amount) {
		if (amount <= 0)
			return OK;

		let lab = Game.getObjectById(labId);

		if (!this.my || !lab || !lab.structureType === STRUCTURE_LAB)
			return ERR_INVALID_TARGET;

		if (!global.LAB_REACTIONS.hasOwnProperty(resourceType)) {
			return ERR_INVALID_ARGS;
		}
		// if (this.memory.resources === undefined) {
		// 	this.memory.resources = {
		// 		lab: [],
		// 		container: [],
		// 		terminal: [],
		// 		storage: [],
		// 	};
		// }

		let labData = this.memory.resources.lab.find((l) => l.id === labId);

		if (!labData) {
			this.memory.resources.lab.push({
				id: labId,
				orders: [{
					type: 'energy',
					orderAmount: 0,
					orderRemaining: 0,
					storeAmount: 2000,
				}],
				reactionState: global.LAB_IDLE,
			});
		}

		this.cancelReactionOrder(labId);

		return OK;
	};

	Room.prototype.placeBasicReactionOrder = function (labId, resourceType, amount, tier = 1) {
		if (amount <= 0)
			return OK;
		if (!global.LAB_REACTIONS.hasOwnProperty(resourceType)) {
			return ERR_INVALID_ARGS;
		}
		// if (this.memory.resources === undefined) {
		// 	this.memory.resources = {
		// 		lab: [],
		// 		container: [],
		// 		terminal: [],
		// 		storage: [],
		// 	};
		// }
		// if (this.memory.resources.powerSpawn === undefined)
		// 	this.memory.resources.powerSpawn = [];

		let lab_master = Game.getObjectById(labId);
		let component_a = global.LAB_REACTIONS[resourceType][0];
		let component_b = global.LAB_REACTIONS[resourceType][1];
		let lab_slave_a = null;
		let lab_slave_b = null;

		// find slave labs
		let nearbyLabs = lab_master.pos.findInRange(FIND_MY_STRUCTURES, 2, {
			filter: (s) => {
				return s.structureType === STRUCTURE_LAB && s.id !== lab_master.id;
			},
		});
		//console.log(lab_master,"found",nearbyLabs.length,"potential slave labs");
		for (let i = 0; i < nearbyLabs.length; i++) {
			let lab = nearbyLabs[i];
			let data = this.memory.resources.lab.find((l) => l.id === lab.id);
			//console.log(lab_master,"potential slave",i,"has",lab.mineralType,"and is currently",data?data.reactionState:"idle");
			if (lab_slave_a == null && data && data.reactionType === component_a) {
				lab_slave_a = lab;
			} else if (lab_slave_b == null && data && data.reactionType === component_b) {
				lab_slave_b = lab;
			}
			if (lab_slave_a && lab_slave_b) break;
		}
		if (!lab_slave_a || !lab_slave_b) {
			nearbyLabs.sort((a, b) => lab_master.pos.getRangeTo(a) - lab_master.pos.getRangeTo(b));
			for (let i = 0; i < nearbyLabs.length; i++) {
				let lab = nearbyLabs[i];
				let data = this.memory.resources.lab.find((l) => l.id === lab.id);
				if (!data || !data.reactionState || data.reactionState === LAB_IDLE) {
					if (lab_slave_a == null) lab_slave_a = lab;
					else if (lab_slave_b == null) lab_slave_b = lab;
				}
			}
		}

		// qualify labs and prepare states
		if (lab_slave_a == null || lab_slave_b == null)
			return ERR_NOT_FOUND;
		let ret = this.prepareReactionOrder(labId, resourceType, amount);
		if (ret !== OK) {
			return ret;
		}
		ret = this.prepareReactionOrder(lab_slave_a.id, resourceType, amount);
		if (ret !== OK) {
			return ret;
		}
		ret = this.prepareReactionOrder(lab_slave_b.id, resourceType, amount);
		if (ret !== OK) {
			return ret;
		}

		// place reaction order with master lab
		let labData = this.memory.resources.lab.find((l) => l.id === labId);
		let state = LAB_MASTER;
		if (labData) {
			if (labData.reactionState === global.LAB_SLAVE_1) state = global.LAB_SLAVE_1;
			if (labData.reactionState === global.LAB_SLAVE_2) state = global.LAB_SLAVE_2;
			labData.reactionState = state;
			labData.reactionType = resourceType;
			labData.reactionAmount = amount;
			labData.slave_a = lab_slave_a.id;
			labData.slave_b = lab_slave_b.id;
		}

		// place orders with slave labs
		labData = this.memory.resources.lab.find((l) => l.id === lab_slave_a.id);
		let slaveState = global.LAB_SLAVE_1;
		let slaveDepth = 1;
		if (state === global.LAB_SLAVE_1) {
			slaveState = global.LAB_SLAVE_2;
			slaveDepth = 2;
		} else if (state === LAB_SLAVE_2) {
			slaveState = global.LAB_SLAVE_3;
			slaveDepth = 3;
		}
		if (labData) {
			labData.reactionState = slaveState;
			labData.reactionType = component_a;
			labData.master = lab_master.id;
			this.placeOrder(lab_slave_a.id, component_a, amount);

			let available = 0;
			if (this.memory.container) {
				for (let i = 0; i < this.memory.container.length; i++) {
					let d = this.memory.container[i];
					let container = Game.getObjectById(d.id);
					if (container && container.store[component_a]) {
						available += container.store[component_a];
					}
				}
			}
			if (this.storage)
				available += this.storage.store[component_a] || 0;
			if (this.terminal)
				available += this.terminal.store[component_a] || 0;
			if (tier > slaveDepth && slaveDepth < 3 && available < amount) {
				if (this.placeReactionOrder(lab_slave_a.id, component_a, amount - available) === OK) {
					let order = labData.orders.find((o) => o.type === component_a);
					if (order) order.orderRemaining = available;
				}
			}
		}
		labData = this.memory.resources.lab.find((l) => l.id === lab_slave_b.id);
		if (labData) {
			labData.reactionState = slaveState;
			labData.reactionType = component_b;
			labData.master = lab_master.id;
			this.placeOrder(lab_slave_b.id, component_b, amount);

			let available = 0;
			if (this.memory.container) {
				for (let i = 0; i < this.memory.container.length; i++) {
					let d = this.memory.container[i];
					let container = Game.getObjectById(d.id);
					if (container) {
						available += container.store[component_b] || 0;
					}
				}
			}
			if (this.storage)
				available += this.storage.store[component_b] || 0;
			if (this.terminal)
				available += this.terminal.store[component_b] || 0;
			if (tier > slaveDepth && slaveDepth < 3 && available < amount) {
				if (this.placeReactionOrder(lab_slave_a.id, component_a, amount - available) === OK) {
					let order = labData.orders.find((o) => o.type === component_b);
					if (order)
						order.orderRemaining = available;
				}
			}
		}

		//console.log(lab_master,"found slave labs",lab_slave_a,"for",component_a,"and",lab_slave_b,"for",component_b);
		return OK;
	};

	Room.prototype.placeFlowerReactionOrder = function (orderId, resourceType, amount, mode = global.REACTOR_MODE_BURST) {

		if (amount <= 0)
			return OK;

		if (!global.LAB_REACTIONS.hasOwnProperty(resourceType)) {
			return ERR_INVALID_ARGS;
		}

		let retOrdersA;
		let retOrdersB;
		let data = this.memory.resources.reactions;
		let that = this;
		let component_a = global.LAB_REACTIONS[resourceType][0];
		let component_b = global.LAB_REACTIONS[resourceType][1];
		let empireResourcesComponentA = that.resourcesAllButMe(component_a);
		let empireResourcesComponentB = that.resourcesAllButMe(component_b);

		let orderForSeeds = function (lab, component, orderAmount, empireResourcesComponent) {

			let resourcesStored = that.resourcesAll[component] || 0,
				amountToOrder = resourcesStored > orderAmount ? 0 : orderAmount - resourcesStored;

			let roundedAmountToOrder = global.roundUpTo(amountToOrder, global.MIN_OFFER_AMOUNT);

			if (amountToOrder < global.TRADE_THRESHOLD && amountToOrder > 0) {

				if (empireResourcesComponent >= global.TRADE_THRESHOLD)
					amountToOrder = global.TRADE_THRESHOLD;
				else if (empireResourcesComponent >= roundedAmountToOrder)
					amountToOrder = roundedAmountToOrder;
			} else if (amountToOrder > 0 && amountToOrder > global.TRADE_THRESHOLD && roundedAmountToOrder <= empireResourcesComponent)
				amountToOrder = roundedAmountToOrder;

			if (amountToOrder > 0 && amountToOrder <= empireResourcesComponent) {
				let ret = that.placeRoomOrder(lab.id, component, amountToOrder);
				global.logSystem(that.name, `placeRoomOrder: ${global.translateErrorCode(ret)}: ${amountToOrder} ${component}`);
				if (ret === OK) {
					global.logSystem(that.name, `placeOrder to lab: ${lab.id} ${orderAmount} ${component}`);
					that.placeOrder(lab.id, component, orderAmount);
					return {
						roomOrderPlaced: true,
						labOrderPlaced: true,
					};
				} else
					return false;
			} else if (amountToOrder === 0) {
				global.logSystem(that.name, `placeOrder to lab: ${lab.id} ${orderAmount} ${component}`);
				that.placeOrder(lab.id, component, orderAmount);
				return {
					roomOrderPlaced: false,
					labOrderPlaced: true,
				};
			}
		};

		// order components for seeds
		let lab_a = this.memory.resources.lab.find(l => l.id === data.seed_a);
		let lab_b = this.memory.resources.lab.find(l => l.id === data.seed_b);

		if (!lab_a || !lab_b)
			return false;

		if (!_.some(lab_a.orders, 'type', component_a)) {
			retOrdersA = orderForSeeds(lab_a, component_a, amount, empireResourcesComponentA);
		}
		if (!_.some(lab_b.orders, 'type', component_b)) {
			retOrdersB = orderForSeeds(lab_b, component_b, amount, empireResourcesComponentB);
		}

		// let data_a_order = lab_a.orders.find(o => o.type === component_a);
		// let data_b_order = lab_b.orders.find(o => o.type === component_b);
		//
		// if (!data_a_order || data_a_order.amount < amount) {
		// 	let orderAmount = amount - (data_a_order ? data_a_order.orderAmount : 0);
		// 	if (orderAmount < global.MIN_OFFER_AMOUNT)
		// 		orderAmount = global.MIN_OFFER_AMOUNT;
		// 	retOrders = orderForSeeds(lab_a, component_a, orderAmount, empireResourcesComponentA);
		// }
		// if (!data_b_order || data_b_order.amount < amount) {
		// 	let orderAmount = amount - (data_b_order ? data_b_order.orderAmount : 0);
		// 	if (orderAmount < global.MIN_OFFER_AMOUNT)
		// 		orderAmount = global.MIN_OFFER_AMOUNT;
		// 	retOrders = orderForSeeds(lab_b, component_b, orderAmount, empireResourcesComponentB);
		// }

		// make memory.object
		data = this.memory.resources;
		if (data.reactions) {
			// create reaction order
			let existingOrder = data.reactions.orders.find((o) => {
				return o.id === orderId && o.type === resourceType;
			});
			if (existingOrder) {
				// update existing order
				if (global.DEBUG && global.TRACE)
					global.trace('Room', {roomName: this.name, actionName: 'placeReactionOrder', subAction: 'update', orderId: orderId, resourceType: resourceType, amount: amount});
				existingOrder.mode = mode;
				existingOrder.amount = amount;
			} else {
				// create new order
				if (global.DEBUG && global.TRACE)
					global.trace('Room', {roomName: this.name, actionName: 'placeReactionOrder', subAction: 'new', orderId: orderId, resourceType: resourceType, amount: amount});
				data.reactions.orders.push({
					id: orderId,
					type: resourceType,
					mode: mode,
					amount: amount,
				});
			}
			data.reactions.reactorMode = mode;
		}

		let boostTiming = this.memory.resources.boostTiming;

		if (retOrdersA.roomOrderPlaced || retOrdersB.roomOrderPlaced) {
			boostTiming.roomState = 'ordersPlaced';
			// TODO is it ok?
			this.GCOrders();
			this.GCOffers();
		} else if (retOrdersA.labOrderPlaced && retOrdersB.labOrderPlaced) {
			boostTiming.roomState = 'reactionMaking';
			boostTiming.checkRoomAt = Game.time;
			delete boostTiming.getOfferAttempts;
			global.logSystem(this.name, `orders done, reaction started`);
			return OK;
		} else
			return false;

		// if (retOrdersA.placeLabOrder && retOrdersB.placeLabOrder)
		// 	return OK;
		// else
		// 	return false;
	};

	Room.prototype.placeReactionOrder = function (orderId, resourceType, amount, mode = global.REACTOR_MODE_BURST) {

		if (amount <= 0)
			return OK;

		if (!global.LAB_REACTIONS.hasOwnProperty(resourceType)) {
			return ERR_INVALID_ARGS;
		}

		// if (this.memory.resources === undefined) {
		// 	this.memory.resources = {
		// 		lab: [],
		// 		container: [],
		// 		terminal: [],
		// 		storage: [],
		// 	};
		// }
		//
		// if (this.memory.resources.powerSpawn === undefined)
		// 	this.memory.resources.powerSpawn = [];

		let lab_master = Game.getObjectById(orderId);
		if (lab_master && lab_master.structureType === STRUCTURE_LAB) {
			let ret = this.placeBasicReactionOrder(orderId, resourceType, amount, 1);
			if (ret === OK)
				return OK;
		}

		let data = this.memory.resources;
		if (data.reactions) {
			let reactorType = data.reactions.reactorType;
			if (reactorType === global.REACTOR_TYPE_FLOWER) {
				let ret = this.placeFlowerReactionOrder(orderId, resourceType, amount, mode);
				if (ret === OK)
					return OK;
				else
					return false;
			}

		} else {
			if (global.DEBUG && global.TRACE)
				global.trace('Room', {roomName: this.name, actionName: 'placeRoomOrder', subAction: 'no_reactor'});
			return ERR_INVALID_TARGET;
		}

		// return OK;
	};


	// New Room methods go here
};
