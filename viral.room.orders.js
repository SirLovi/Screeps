const mod = {};
module.exports = mod;
mod.analyzeRoom = function (room, needMemoryResync) {

	if (Memory.marketOrders && Memory.marketOrders.updated !== Game.time)
		delete Memory.marketOrders;

	if (Game.time % global.PROCESS_ORDERS_INTERVAL === 0 || room.name === 'sim') {
		if (_.some(acceptedRooms, r => {
			return r.name === room.name;
		})) {
			room.updateResourceOrders();
			room.updateRoomOrders();
			room.terminalBroker();
		}
	}
};
mod.extend = function () {

	Room.prototype.updateResourceOrders = function () {
		let data = this.memory.resources;
		if (!this.my || !data) return;

		// go through reallocation orders and reset completed orders
		for (let structureType in data) {
			for (let i = 0; i < data[structureType].length; i++) {
				let structure = data[structureType][i];
				// don't reset busy labs
				if (structureType === STRUCTURE_LAB && structure.reactionState !== LAB_IDLE)
					continue;
				if (!structure.orders)
					continue;
				for (let j = 0; j < structure.orders.length; j++) {
					let order = structure.orders[j];
					if (order.orderRemaining <= 0) {
						let baseAmount = 0;
						let rcl = this.controller.level;
						if (structureType === STRUCTURE_STORAGE)
							baseAmount = order.type === RESOURCE_ENERGY ? MIN_STORAGE_ENERGY[rcl] : MAX_STORAGE_MINERAL;
						else if (structureType === STRUCTURE_TERMINAL)
							baseAmount = order.type === RESOURCE_ENERGY ? TERMINAL_ENERGY : 0;
						baseAmount += order.storeAmount;
						let amount = 0;
						let cont = Game.getObjectById(structure.id);
						if (cont && structureType === STRUCTURE_LAB) {
							switch (structureType) {
								case STRUCTURE_LAB:
									// get lab amount
									if (order.type === cont.mineralType) {
										amount = cont.mineralAmount;
									} else if (order.type === RESOURCE_ENERGY) {
										amount = cont.energy;
									}
									break;
								case STRUCTURE_POWER_SPAWN:
									// get power spawn amount
									if (order.type === RESOURCE_POWER) {
										amount = cont.power;
									} else if (order.type === RESOURCE_ENERGY) {
										amount = cont.energy;
									}
									break;
								case STRUCTURE_NUKER:
									// get nuker amount
									if (order.type === RESOURCE_GHODIUM) {
										amount = cont.store[RESOURCE_GHODIUM];
									} else if (order.type === RESOURCE_ENERGY) {
										amount = cont.energy;
									}
									break;
								default:
									// get stored amount
									amount = cont.store[order.type] || 0;
									break;
							}
						}
						if (amount < baseAmount) {
							order.orderAmount = 0;
							order.orderRemaining = 0;
						}
					}
				}
			}
		}
	};

	Room.prototype.updateRoomOrders = function () {
		if (!this.memory.resources || !this.memory.resources.orders)
			return;
		let rooms = _.filter(acceptedRooms, room => {
			return room.name !== this.name;
		});
		let orders = this.memory.resources.orders;
		for (let [i, order] of orders.entries()) {
			let amountRemaining = order.amount;
			for (let [j, offer] of order.offers.entries()) {
				if (Memory.rooms[offer.room] && Memory.rooms[offer.room].resources && Memory.rooms[offer.room].resources.offers) {
					let remoteOffers = Memory.rooms[offer.room].resources.offers;
					let idx = remoteOffers.indexOf(o => {
						return o.room === this.name && o.id === order.id && o.type === order.type;
					});
					if (idx !== -1) {
						remoteOffers.splice(idx, 1);
						// added line
						j--;
					}
				}
			}
			order.offers = [];
			if (amountRemaining <= 0) {
				orders.splice(i, 1);
				i--;
			} else {
				rooms.sort((a, b) => {
					return Game.map.getRoomLinearDistance(this.name, a.name, true) - Game.map.getRoomLinearDistance(this.name, b.name, true);
				});
				for (let j = 0; j < rooms.length; j++) {

					let room = rooms[j];

					// if (room.memory.resources === undefined) {
					// 	room.memory.resources = {
					// 		lab: [],
					// 		container: [],
					// 		terminal: [],
					// 		storage: [],
					// 		powerSpawn: [],
					// 	};
					// }
					//
					// if (!room.memory.resources.offers)
					// 	room.memory.resources.offers = [];

					let remoteOffers = room.memory.resources.offers;
					let allocatable = room.resourcesAll[order.type] || 0;

					if (allocatable < global.MIN_OFFER_AMOUNT)
						continue;

					// for COMPOUNDS_MANAGE
					if (global.isCompoundToManage(order.type)) {
						let roomThreshold = Memory.compoundsManage[order.type].roomThreshold;
						if (allocatable < roomThreshold + global.MIN_OFFER_AMOUNT)
							continue;
						else
							allocatable = allocatable - roomThreshold;
					}

					if (amountRemaining < global.MIN_OFFER_AMOUNT && amountRemaining > 0)
						amountRemaining = global.MIN_OFFER_AMOUNT;

					allocatable = Math.min(allocatable, amountRemaining);

					let existingOffer = order.offers.find(o => {
						return o.room === room.name;
					});
					let existingRemoteOffer = remoteOffers.find(o => {
						return o.room === this.name && o.id === order.id && o.type === order.type;
					});
					if (existingOffer) {
						if (global.DEBUG && global.TRACE)
							global.trace('Room', {roomName: this.name, remoteRoom: room.name, actionName: 'updateRoomOrders', subAction: 'update', orderId: order.id, resourceType: order.type, amount: allocatable});
						amountRemaining -= (allocatable - existingOffer.amount);
						existingOffer.amount = allocatable;
						// room.fillARoomOrder();
					} else {
						if (global.DEBUG && global.TRACE)
							global.trace('Room', {roomName: this.name, remoteRoom: room.name, actionName: 'updateRoomOrders', subAction: 'new', orderId: order.id, resourceType: order.type, amount: allocatable});
						if (global.DEBUG)
							global.logSystem(this.name, `Room offer from ${room.name} with id ${order.id} placed for ${allocatable} ${order.type}.`);
						amountRemaining -= allocatable;
						order.offers.push({
							room: room.name,
							amount: allocatable,
						});
						// room.fillARoomOrder();
					}
					if (existingRemoteOffer) {
						existingRemoteOffer.amount = allocatable;
					} else {
						remoteOffers.push({
							room: this.name,
							id: order.id,
							type: order.type,
							amount: allocatable,
						});
						// room.fillARoomOrder();
					}

					if (amountRemaining <= 0) {
						// room.fillARoomOrder();
						break;
					}
				}
			}
		}
	};

	Room.prototype.fillARoomOrder = function () {
		if (!(this.terminal && this.memory && this.memory.resources && this.memory.resources.offers))
			return false;

		let offers = this.memory.resources.offers,
			ret,
			retSend;

		for (let i = 0; i < offers.length; i++) {

			let offer = offers[i];
			let targetRoom = Game.rooms[offer.room];

			if (!(targetRoom && targetRoom.memory && targetRoom.memory.resources && targetRoom.memory.resources.orders))
				continue;

			let order = targetRoom.memory.resources.orders.find((o) => {
				return o.id === offer.id && o.type === offer.type;
			});

			if (!order)
				continue;

			let targetOfferIdx = order.offers.findIndex((o) => {
				return o.room === this.name;
			});

			if (targetOfferIdx === -1) {
				global.logSystem(this.name, 'Orphaned offer found and deleted');
				offers.splice(i--, 1);
				continue;
			}

			let store = this.terminal.store[offer.type] || 0;
			let onOrder = 0;
			let terminalOrder = null;
			if (this.memory.resources.terminal[0])
				terminalOrder = this.memory.resources.terminal[0].orders.find((o) => {
					return o.type === offer.type;
				});
			if (terminalOrder)
				onOrder = terminalOrder.orderRemaining;

			let amount = Math.max(offer.amount, global.MIN_OFFER_AMOUNT);

			if (amount > (store + onOrder)) {
				let amt = amount - (store + onOrder);
				if (global.DEBUG && global.TRACE)
					global.trace('Room', {actionName: 'fillARoomOrder', subAction: 'terminalOrder', roomName: this.name, targetRoomName: targetRoom.name, resourceType: offer.type, amount: amt});
				ret = this.placeOrder(this.terminal.id, offer.type, amt);
				if (ret !== OK)
					return ret;
			}

			if (!targetRoom.terminal)
				continue;

			let space = targetRoom.terminal.store.getCapacity() - targetRoom.terminal.sum;
			amount = Math.min(amount, space, store);

			let cost = Game.market.calcTransactionCost(amount, this.name, targetRoom.name);
			if (offer.type === RESOURCE_ENERGY) {
				cost += amount;
				if (cost > (this.terminal.store.energy || 0)) {
					amount -= cost;
					cost = Game.market.calcTransactionCost(amount, this.name, targetRoom.name);
				}

			}
			if (cost > (this.terminal.store.energy || 0))
				continue;
			if (amount < global.MIN_OFFER_AMOUNT)
				continue;

			retSend = this.terminal.send(offer.type, amount, targetRoom.name, order.id);
			if (retSend === OK) {
				if (global.DEBUG && global.TRACE)
					global.trace('Room', {actionName: 'fillARoomOrder', roomName: this.name, targetRoomName: targetRoom.name, resourceType: offer.type, amount: amount});
				if (global.DEBUG)
					global.logSystem(this.name, `Room order filled to ${targetRoom.name} for ${amount} ${offer.type}.`);
				offer.amount -= amount;
				if (offer.amount > 0) {
					order.offers[targetOfferIdx].amount = offer.amount;
					if (terminalOrder) {
						let needing = offer.amount - store;
						if (needing > 0) {
							terminalOrder.orderAmount = needing;
							terminalOrder.orderRemaining = needing;
						} else
							terminalOrder.orderRemaining = 0;
					}
				} else {
					// delete order.offers[targetOfferIdx];
					order.offers.splice(targetOfferIdx, 1);
					// delete offers[i];
					offers.splice(i--, 1);
				}
				order.amount -= amount;
				return OK;
			}
		}

		return retSend;
	};

	Room.prototype.prepareResourceOrder = function (containerId, resourceType, amount) {
		let container = Game.getObjectById(containerId);
		if (!this.my || !container || container.room.name !== this.name ||
			!(container.structureType === STRUCTURE_LAB ||
				container.structureType === STRUCTURE_POWER_SPAWN ||
				container.structureType === STRUCTURE_NUKER ||
				container.structureType === STRUCTURE_CONTAINER ||
				container.structureType === STRUCTURE_STORAGE ||
				container.structureType === STRUCTURE_TERMINAL)) {
			return ERR_INVALID_TARGET;
		}
		if (!RESOURCES_ALL.includes(resourceType)) {
			return ERR_INVALID_ARGS;
		}
		// if (this.memory.resources === undefined) {
		// 	this.memory.resources = {
		// 		lab: [],
		// 		powerSpawn: [],
		// 		nuker: [],
		// 		container: [],
		// 		terminal: [],
		// 		storage: [],
		// 	};
		// }
		// if (this.memory.resources.powerSpawn === undefined)
		// 	this.memory.resources.powerSpawn = [];
		// if (this.memory.resources.nuker === undefined)
		// 	this.memory.resources.nuker = [];

		if (!this.memory.resources[container.structureType].find((s) => s.id === containerId)) {
			this.memory.resources[container.structureType].push(container.structureType === STRUCTURE_LAB ? {
				id: containerId,
				orders: [],
				reactionState: LAB_IDLE,
			} : {
				id: containerId,
				orders: [],
			});
		}
		if (container.structureType === STRUCTURE_LAB && resourceType !== RESOURCE_ENERGY && amount > 0) {
			// clear other resource types since labs only hold one at a time
			let orders = this.memory.resources[STRUCTURE_LAB].find((s) => s.id === containerId).orders;
			for (let i = 0; i < orders.length; i++) {
				if (orders[i].type !== resourceType && orders[i].type !== RESOURCE_ENERGY) {
					orders[i].orderAmount = 0;
					orders[i].orderRemaining = 0;
					orders[i].storeAmount = 0;
				}
			}
		}
		// Garbage collecting terminal orders
		// if (container.structureType === STRUCTURE_TERMINAL) {
		// 	let data = this.memory.resources;
		// 	let terminalOrders = data.terminal[0].orders;
		//
		// 	for (let [idx, order] of terminalOrders.entries()) {
		// 		if (order.storeAmount === 100 && order.orderRemaining === 0 && order.orderAmount !== 0) {
		// 			order.orderAmount = 0;
		// 		}
		// 		let terminalStored = this.terminal.store[order.type] || 0;
		// 		if (order.storeAmount === 0
		// 			&& (order.orderAmount - order.orderRemaining !== terminalStored + (this.resourcesCreeps[order.type] || 0))) {
		// 			terminalOrders.splice(idx, 1);
		// 			idx--;
		// 		}
		// 	}
		// }


		return OK;
	};

	Room.prototype.cancelOrder = function (containerId, resourceType = null) {
		let container = Game.getObjectById(containerId);
		if (this.prepareResourceOrder(containerId, RESOURCE_ENERGY, 0) !== OK)
			return ret;

		let containerData = this.memory.resources[container.structureType].find((s) => s.id === containerId);
		if (containerData) {
			if (resourceType) {
				let existingOrder = containerData.orders.find((r) => r.type === resourceType);
				if (existingOrder) {
					// delete structure order
					if (global.DEBUG && global.TRACE)
						global.trace('Room', {roomName: this.name, actionName: 'cancelOrder', orderId: orderId, resourceType: resourceType});
					containerData.orders.splice(containerData.orders.indexOf(existingOrder), 1);
				}
			} else {
				// delete all of structure's orders
				if (global.DEBUG && global.TRACE)
					global.trace('Room', {roomName: this.name, actionName: 'cancelOrder', orderId: orderId, resourceType: 'all'});
				containerData.orders = [];
			}
		}
		return OK;
	};

	Room.prototype.registerBoostLab = function (labId) {
		let lab = Game.getObjectById(labId);
		if (lab) {
			if (_.isUndefined(this.memory.resources)) {
				this.memory.resources = {
					lab: [],
					powerSpawn: [],
					container: [],
					terminal: [],
					storage: [],
				};
			}
			let dataIndex = this.memory.resources.lab.findIndex(x => x.id === labId);
			if (dataIndex > -1) {
				delete this.memory.resources.lab[dataIndex].reactionType;
				this.memory.resources.lab[dataIndex].reactionState = 'Storage';
			} else {
				let obj = {id: labId, orders: [], reactionState: 'Storage'};
				this.memory.resources.lab.push(obj);
			}
		}
	};

	Room.prototype.unRegisterBoostLab = function (labId) {
		let lab = Game.getObjectById(labId),
			data = this.memory.resources;

		if (lab && data) {
			let dataIndex = this.memory.resources.lab.findIndex(x => x.id === labId);
			if (dataIndex > -1) {
				if (data.reactions && data.reactions.orders.length > 0)
					this.memory.resources.lab[dataIndex].reactionType = this.memory.resources.reactions.orders[0].type;
				this.memory.resources.lab[dataIndex].reactionState = 'idle';
				this.memory.resources.lab[dataIndex].orders = _.filter(this.memory.resources.lab[dataIndex].orders, 'type', 'energy');
			}
		}
	};

	Room.prototype.placeOrder = function (containerId, resourceType, amount) {
		let container = Game.getObjectById(containerId);
		let ret = this.prepareResourceOrder(containerId, resourceType, amount);
		global.logSystem(this.name, `prepareResourceOrder: ${global.translateErrorCode(ret)}`);
		if (ret !== OK) {
			return ret;
		}

		let containerData = this.memory.resources[container.structureType].find((s) => s.id === containerId);

		if (containerData) {
			let existingOrder = containerData.orders.find((r) => r.type === resourceType);
			let containerStore;

			if (container.structureType === STRUCTURE_LAB) {
				containerStore = (container.mineralType === resourceType) ? container.store[container.mineralType] : 0;
			} else {
				containerStore = container.store[resourceType] || 0;
			}

			let orderAmount = amount - containerStore;

			let resourcesAll = this.resourcesAll[resourceType] || 0;

			// if (container.structureType === STRUCTURE_TERMINAL)
			// 	resourcesAll = (this.resourcesAll[resourceType] || 0) + (this.resourcesOffers[resourceType] || 0);
			// else
			// 	resourcesAll = this.resourcesAll[resourceType] || 0;


			global.logSystem(this.name, `amount: ${amount} orderAmount: ${orderAmount} resourcesAll: ${resourcesAll} ${resourceType}`);

			if (existingOrder) {
				global.logSystem(this.name, `order already exist:`);

				if (orderAmount > 0) {
					existingOrder.orderAmount += orderAmount;
					existingOrder.orderRemaining += orderAmount;
				}
				global.BB(existingOrder);

			} else {
				global.logSystem(this.name, `new order placed: ${orderAmount} ${resourceType}`);
				if (orderAmount > 0) {
					containerData.orders.push({
						type: resourceType,
						orderAmount: orderAmount,
						orderRemaining: orderAmount,
						storeAmount: 0,
					});
					// global.BB(containerData.orders);
					// if (container.structureType === STRUCTURE_LAB && containerData.reactionState !== 'Storage') {
					// 	containerData.isMainCompoundAllocateble = resourceType;
					// }
				}


			}
			// this.memory.resources[container.structureType].orders = []
			// this.cancelOrder(containerId, resourceType);
			// return ERR_NOT_ENOUGH_RESOURCES;
		}
		return OK;
	};

	Room.prototype.setStore = function (containerId, resourceType, amount) {
		let container = Game.getObjectById(containerId);
		let ret = this.prepareResourceOrder(containerId, resourceType, amount);
		if (ret !== OK) {
			return ret;
		}

		let containerData = this.memory.resources[container.structureType].find((s) => s.id === containerId);
		if (containerData) {
			let existingOrder = containerData.orders.find((r) => r.type === resourceType);
			if (existingOrder) {
				existingOrder.storeAmount = amount;
			} else {
				containerData.orders.push({
					type: resourceType,
					orderAmount: 0,
					orderRemaining: 0,
					storeAmount: amount,
				});
			}
		}
		return OK;
	};

	Room.prototype.cancelRoomOrder = function (orderId = null, resourceType = null) {
		if (this.memory.resources === undefined) {
			this.memory.resources = {
				lab: [],
				container: [],
				terminal: [],
				storage: [],
			};
		}
		if (this.memory.resources.powerSpawn === undefined) this.memory.resources.powerSpawn = [];
		if (this.memory.resources.orders === undefined) {
			this.memory.resources.orders = [];
		}
		let orders = this.memory.resources.orders;
		if (orderId && resourceType) {
			let existingOrder = orders.find((o) => {
				return o.id === orderId && o.type === resourceType;
			});
			if (existingOrder) {
				// delete existing order
				if (global.DEBUG && global.TRACE) trace('Room', {roomName: this.name, actionName: 'cancelRoomOrder', orderId: orderId, resourceType: resourceType});
				orders.splice(orders.indexOf(existingOrder), 1);
			}
		} else if (orderId) {
			// delete all orders matching orderId
			if (global.DEBUG && global.TRACE) trace('Room', {roomName: this.name, actionName: 'cancelRoomOrder', orderId: orderId, resourceType: 'all'});
			for (let i = 0; i < orders.length; i++) {
				let order = orders[i];
				if (order.id === orderId) {
					orders.splice(i--, 1);
				}
			}
		} else {
			// delete all orders associated with this room
			this.memory.resources.orders = [];
		}

		return OK;
	};

	Room.prototype.placeRoomOrder = function (orderId, resourceType, amount) {

		if (amount <= 0)
			return OK;

		if (amount > this.resourcesAllButMe(resourceType))
			return false;

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
		// if (this.memory.resources.orders === undefined) {
		// 	this.memory.resources.orders = [];
		// }
		let orders = this.memory.resources.orders;
		let existingOrder = orders.find((o) => {
			return o.id === orderId && o.type === resourceType;
		});
		if (existingOrder) {
			// update existing order
			if (global.DEBUG && global.TRACE)
				global.trace('Room', {roomName: this.name, actionName: 'placeRoomOrder', subAction: 'update', orderId: orderId, resourceType: resourceType, amount: amount});
			existingOrder.amount += amount;

		} else {
			// create new order
			if (global.DEBUG && global.TRACE)
				global.trace('Room', {roomName: this.name, actionName: 'placeRoomOrder', subAction: 'new', orderId: orderId, resourceType: resourceType, amount: amount});
			if (global.DEBUG)
				global.logSystem(this.name, `New room order with id ${orderId} placed for ${amount} ${resourceType}.`);
			orders.push({
				id: orderId,
				type: resourceType,
				amount: amount,
				offers: [],
			});
		}
		return OK;
	};

	Room.prototype.transferEnergy = function () {
		global.logSystem(this.name, `TERMINAL BROKER FOR: ${this.name}`);

		if (this.terminal.cooldown && this.terminal.cooldown > 0)
			return;

		let that = this;
		let transacting = false;


		let offerRoomCharge = global.Util.chargeScale(this.storage.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT,
			global.MIN_STORAGE_ENERGY[this.controller.level],
			global.MAX_STORAGE_ENERGY[this.controller.level]);

		global.logSystem(this.name, `energy stored: ${this.storage.store.energy} chargeScale: ${global.round(offerRoomCharge, 3)}`);

		if (this.controller.level === 8 && offerRoomCharge > 1 && this.terminal.store.energy > global.ENERGY_BALANCE_TRANSFER_AMOUNT * 1.1) {

			global.logSystem(this.name, `can transfer energy`);

			let requiresEnergy = room => (
				global.terminalCapacity * global.TARGET_STORAGE_SUM_RATIO > room.terminal.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT
				&& global.storageCapacity * global.TARGET_STORAGE_SUM_RATIO > room.storage.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT
				&& !room._isReceivingEnergy
				&& room.storage.store.energy < global.MAX_STORAGE_ENERGY[room.controller.level]
			);

			let targetRooms = _.filter(global.acceptedRooms, requiresEnergy);

			for (const targetRoom of targetRooms)
				console.log(`targetRooms: ${targetRoom.name} ${targetRoom.storage.store.energy}`);

			let targetRoom = _.min(targetRooms, 'storage.store.energy');

			if (targetRoom instanceof Room) {

				global.logSystem(targetRoom.name, `TARGET_ROOM: ${targetRoom.name} storage: ${targetRoom.storage.store.energy} terminal: ${targetRoom.terminal.store.energy}`);

				let transAction = function () {

					targetRoom._isReceivingEnergy = true;

					if (global.TERMINAL_BROKER_TRANSFER_ENERGY) {
						let response = that.terminal.send('energy', transactionAmount, targetRoom.name, 'have fun');

						if (global.DEBUG)
							global.logSystem(that.name, `Transferring ${global.Util.formatNumber(transactionAmount)} energy to ${targetRoom.name} ${targetRoomCharge}: ${global.translateErrorCode(response)}`);

						transacting = response === OK;

					} else {
						console.log(`TERMINAL_BROKER_TRANSFER_ENERGY: ${global.TERMINAL_BROKER_TRANSFER_ENERGY}`);
						if (global.DEBUG)
							global.logSystem(that.name, `CAN Transferring ${global.Util.formatNumber(transactionAmount)} energy to ${targetRoom.name} ${targetRoomCharge}`);

					}
				};

				let transactionCost = Game.market.calcTransactionCost(global.ENERGY_BALANCE_TRANSFER_AMOUNT, this.name, targetRoom.name);
				let transactionAmount = global.ENERGY_BALANCE_TRANSFER_AMOUNT;

				let targetRoomCharge = global.Util.chargeScale(targetRoom.storage.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT,
					global.MIN_STORAGE_ENERGY[targetRoom.controller.level],
					global.MAX_STORAGE_ENERGY[targetRoom.controller.level]);

				if (targetRoomCharge < 0.5 && transactionCost > (this.terminal.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT)) {
					transactionAmount = global.changeAmount(this.name, targetRoom.name, global.ENERGY_BALANCE_TRANSFER_AMOUNT, this.terminal.store.energy, true);
					transAction();
				} else if (transactionCost < (this.terminal.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT))
					transAction();


			} else {
				global.logSystem(this.name, `NO ENERGY TRANSFER`);
			}
		}

		global.logSystem(this.name, `transacting: ${transacting}`);

		return transacting;
	};

	Room.prototype.sellMineral = function () {
		// we want to sell
		if ((this.controller.level === 8 || global.MARKET_SELL_NOT_RCL8_ROOMS) && global.TERMINAL_BROKER_SELL) {

			for (const mineral in this.terminal.store) {

				let sell = false;

				// ENERGY
				if (mineral === RESOURCE_ENERGY && global.TERMINAL_BROKER_SELL_ENERGY) {
					sell = true;
					// ROOM MINERAL
				} else if (mineral === this.mineralType) {
					if (this.resourcesAll[mineral] > global.MAX_STORAGE_MINERAL)
						sell = true;
					// COMPOUND
				} else if (global.isCompoundToManage(mineral)) {
					if (Memory.compoundsManage[mineral].sell
						&& this.resourcesAll[mineral] > Memory.compoundsManage[mineral].roomThreshold + Memory.compoundsManage[mineral].reservedAmount)
						sell = true;
					// OTHER
				} else {
					if (this.resourcesAll[mineral] > global.MAX_STORAGE_NOT_ROOM_MINERAL && mineral !== RESOURCE_ENERGY)
						sell = true;
				}

				let terminalStored = global.round((this.terminal.store[mineral] || 0) - (this.resourcesOffers[mineral] || 0) - (this.resourcesReactions[mineral] || 0));

				if (mineral === 'energy')
					terminalStored = _.min([terminalStored, global.ENERGY_BALANCE_TRANSFER_AMOUNT]);

				if (terminalStored > global.MIN_OFFER_AMOUNT && sell) {

					global.logSystem(this.name, `trying to sell: ${terminalStored} ${mineral}`);

					let order = global.bestMarketOrder(this.name, terminalStored, mineral, ORDER_BUY);// we want to sell

					if (!order) {

						global.logSystem(this.name, `No order found for ${mineral}`);

					} else {

						let result = Game.market.deal(order.id, order.transactionAmount, this.name);

						global.logSystem(this.name, `Selling ${order.transactionAmount} ${order.resourceType} for ${global.round(order.credits)} -> (${order.price}¢/${mineral}, energyCost: ${order.transactionCost} energyPrice: ${global.round(order.transactionPrice)}¢ report: ${global.translateErrorCode(result)})`);

						if (result === OK) {
							Memory.marketOrders.completedDeal++;
							global.logSystem(this.name, `Selling successfully done`);
							global.logSystem(this.name, `id: ${order.id} -> ${order.transactionAmount} ${order.resourceType} -> (ratio: ${global.round(order.ratio, 4)} income: ${global.round(order.credits - order.transactionPrice)}¢)`);
							global.logSystem(this.name, `completed: ${Memory.marketOrders.completedDeal}`);
							global.updateMarketOrders(order.id, order.transactionAmount, mineral, ORDER_BUY); // we want to sell
							break;
						}
					}
				}
			}
		}
	};

	Room.prototype.terminalBroker = function () {

		if (!this.transferEnergy())
			this.sellMineral();

	};

	Room.prototype.terminalOrderToSell = function () {

		if (!this.my || !this.terminal || !this.storage)
			return;

		//console.log(`NUKED: ${this.nuked}`);

		let that = this,
			resources = this.memory.resources;

		// _.forEach(object, function (value, key)
		_.forEach(this.storage.store, function (amount, mineral) {

			if (mineral !== RESOURCE_ENERGY && mineral !== RESOURCE_POWER) {

				let freeSpace = global.MAX_TERMINAL_MINERAL - global.TERMINAL_ENERGY + that.terminal.store[RESOURCE_ENERGY] - _.sum(that.terminal.store) - (resources.terminal[0].orders.length > 0 ?
						_.sum(resources.terminal[0].orders, order => {
							return order.orderRemaining;
						}) : 0),
					offered = that.resourcesOffers[mineral] || 0,
					inReaction = that.resourcesReactions[mineral] || 0,
					validRoomMineral = amount >= global.MAX_STORAGE_MINERAL + offered + inReaction + 1550 && mineral === that.memory.mineralType ?
						amount - global.MAX_STORAGE_MINERAL - offered - inReaction : 0,
					validNotRoomMineral = amount >= global.MAX_STORAGE_NOT_ROOM_MINERAL + offered + inReaction + 1550 && mineral !== that.memory.mineralType && mineral !== 'G' && mineral.length === 1 ?
						amount - global.MAX_STORAGE_NOT_ROOM_MINERAL - offered - inReaction : 0,
					validCompound = function () {
						// TODO count the number of nuke (damage center: 10M, others: 5M, radius: 5) and if ramparts hits < nuke.damage
						// for sale
						if (this.nuked && global.SELL_COMPOUND[mineral] && mineral !== 'XLH2O')
							return amount;
						else if (global.SELL_COMPOUND[mineral] && global.SELL_COMPOUND[mineral].sell && amount >= global.SELL_COMPOUND[mineral].maxStorage + offered + 1550
							&& (_.some(global.SELL_COMPOUND[mineral].rooms, room => {
								return room === that.name;
							}) || global.SELL_COMPOUND[mineral].rooms.length === 0)
						)
							return amount - global.SELL_COMPOUND[mineral].maxStorage - offered;
						else
							return 0;
					},
					terminalOrderRemaining = resources.terminal[0].orders.length > 0 ? global.sumCompoundType(resources.terminal[0].orders, 'orderRemaining')[mineral] || 0 : 0,
					transferAmount = validRoomMineral + validNotRoomMineral + validCompound();


				if (terminalOrderRemaining === 0) {
					if (transferAmount >= global.MIN_OFFER_AMOUNT) {

						if (freeSpace >= transferAmount) {
							that.placeOrder(that.terminal.id, mineral, transferAmount);
							global.logSystem(that.name, `terminal order placed for sell ${transferAmount} ${mineral} `);

						} else if (freeSpace >= global.MIN_MINERAL_SELL_AMOUNT) {
							// try max amount
							that.placeOrder(that.terminal.id, mineral, freeSpace);
							global.logSystem(that.name, `terminal order placed for sell ${freeSpace} ${mineral} - terminalFull, transferAmount would be: ${transferAmount}`);
						}
					}
				}
			}
		});

	};

	Room.prototype.cancelTerminalOrderToSell = function () {

		if (!this.my || !this.terminal || !this.storage)
			return;

		let that = this;


		// _.forEach(object, function (value, key)
		for (let mineral in this.terminal.store) {

			if (mineral.length !== 5)
				continue;

			if (!(global.SELL_COMPOUND[mineral]
				&& global.SELL_COMPOUND[mineral].sell
				&& (_.some(global.SELL_COMPOUND[mineral].rooms, room => {
					return room === that.name;
				}) || global.SELL_COMPOUND[mineral].rooms.length === 0)
			)) {
				global.logSystem(this.name, `order cancelled for ${mineral}`);
				this.cancelOrder(this.terminal.id, mineral);
			}

		}
	};

	Room.prototype.garbageCollectStorageOrders = function () {

		let orders = this.memory.resources.storage[0].orders;

		this.memory.resources.storage[0].orders = _.filter(orders, order => {
			return order.orderRemaining > 0;
		});

	};

	Room.prototype.garbageCollectTerminalOrders = function () {

		let orders = this.memory.resources.terminal[0].orders;

		this.memory.resources.terminal[0].orders = _.filter(orders, order => {
			return order.orderRemaining > 0 || order.storeAmount > 0;
		});

	};

};
