'use strict';

let viralUtil = {};

viralUtil.deleteRoads = function (flush = false) {

	if (flush)
		_.forEach(Memory.rooms, r => delete r.roadConstructionTrace);

	let room = 'E27S23',
		structures = Game.rooms[room].find(FIND_STRUCTURES),
		roads = _.filter(structures, function (structure) {
			return structure.structureType === STRUCTURE_ROAD;
		});
	roads.forEach(road => {
		road.destroy();
	});

};

viralUtil.deleteStructures = function (roomName, type) {

	if (roomName === undefined) {
		console.log('usage: Util.deleteStructure(RoomName, structureType)');
		return;
	}

	let structures = Game.rooms[roomName].find(FIND_STRUCTURES);

	if (type) {
		structures = _.filter(structures, structure => {
			return structure.structureType === type;
		});
	}
	structures.forEach(structure => {
		structure.destroy();
	});
	console.log(`structures in room ${Game.rooms[roomName]} destroyed`);

};

// delete all constructionSites
viralUtil.deleteConstructionSites = function (roomName) {
	if (_.isUndefined(roomName)) {
		console.log(`delete all constructionSites`);
		for (const room of myRooms) {
			let constructionSites = room.myConstructionSites;
			console.log(`room: ${room.name} sites: ${constructionSites}`);
			constructionSites.forEach(site => {
				console.log(`room: ${room.name} type: ${site.structureType}`);
				site.remove();
			});
		}
	} else {
		let constructionSites = Game.rooms[roomName].myConstructionSites;
		constructionSites.forEach(site => {
			site.remove();
		});
	}
};

viralUtil.DCS = function () {
	for (const cs in Game.constructionSites) {
		Game.constructionSites[cs].remove();
	}
};

// running data to debug a creep use
viralUtil.data = function (creepName) {
	console.log('Explain');
	let ret = Game.creeps[creepName].explain();
	global.logSystem(Game.creeps[creepName].room.name, `${ret}`);
	console.log('JSON');
	console.log(global.json(Game.creeps[creepName].data));
};

viralUtil.resetBoostProduction = function (roomName) {

	let data;

	for (let room of myRooms) {

		if ((roomName === undefined || room.name === roomName)) {

			data = room.memory.resources;

			console.log(room.name);

			if (!_.isUndefined(data)) {

				data.offers = [];
				data.orders = [];

				if (data.terminal[0])
					data.terminal[0].orders = [];

				if (data.storage[0])
					data.storage[0].orders = [];

				if (data.reactions)
					data.reactions.orders = [];

				if (data.lab) {
					data.lab = [];
					_.values(Game.structures).filter(i => i.structureType === 'lab').map(i => i.room.setStore(i.id, RESOURCE_ENERGY, 2000));
				}

				data.reactions.reactorMode = global.REACTOR_MODE_IDLE;


				data.boostTiming = {};
				// delete data.seedCheck;
			} else
				console.log(`${room.name} has no memory.resources`);
		}
	}
	if (roomName === undefined)
		Memory.boostTiming = {};

};

viralUtil.cleanTrace = function () {
	for (let room of myRooms)
		delete room.memory.roadConstructionTrace;

};

viralUtil.roomStored = function (mineral) {

	let roomStored = 0;

	for (let room of acceptedRooms) {
		roomStored += (room.storage.store[mineral] || 0) + (room.terminal.store[mineral] || 0);
	}
	return roomStored;
};

viralUtil.resourcesAll = function (mineral) {


	let roomStored = 0;

	for (let room of acceptedRooms) {
		let resources = room.resourcesAll[mineral] || 0;
		if (resources >= global.MIN_OFFER_AMOUNT)
			roomStored += resources;
	}
	return roomStored;
};

viralUtil.launchNuke = function (roomA, roomB, x, y) {

	console.log(`hello`);

	let roomFrom = Game.rooms[roomA],
		roomTo = Game.rooms[roomB],
		nuke = Game.getObjectById(roomFrom.memory.nukers[0].id),
		target = new RoomPosition(x, y, roomB),
		returnValue;

	if (_.isUndefined(roomTo)) {
		console.log(`targetRoom: ${roomB} not visible`);
	}


	if (!nuke.isActive())
		return false;

	if (nuke.store['energy'] < nuke.store.getCapacity('energy')) {
		console.log(`not enough energy to launch nuke! energy: ${nuke.energy} energyCapacity: ${nuke.energyCapacity}`);
		return false;
	}

	if (nuke.store['G'] < nuke.store.getCapacity('G')) {
		console.log(`not enough G to launch nuke! ghodium: ${nuke.store['G']} ghodiumCapacity: ${nuke.store.getCapacity('G')}`);
		return false;
	}

	// if (Game.map.getRoomLinearDistance(roomFrom.name, roomTo.name) > 10) {
	// 	console.log(`${roomB} is too far to launch nuke`);
	// 	return false;
	// }

	returnValue = nuke.launchNuke(target);

	if (returnValue === OK)
		console.log('Nuke LAUNCHED!!!');
	else
		console.log(`Nuke launch failed: ${this.translateErrorCode(returnValue)}`);

};

viralUtil.checkTier3 = function () {
	for (let room of acceptedRooms) {

		for (const [key, value] of Object.entries(global.COMPOUNDS_TO_MAKE)) {

			if (room.resourcesAll[key] < global.COMPOUNDS_TO_MAKE[key].roomThreshold || 0)
				console.log(`${room.name}: ${key} ${room.resourcesAll[key] || 0}`);
		}
	}
};

viralUtil.storageFull = function () {

	for (let room of acceptedRooms) {

		let sumStorage = _.sum(room.storage.store);

		if (sumStorage >= STORAGE_CAPACITY * 0.9) {
			console.log(`${room.name} ${sumStorage / STORAGE_CAPACITY}`);
			room.terminalBroker();
		}

	}

};

// if terminalBroker find a room for transfer
viralUtil.roomEnergy = () => {


	let requiresEnergy = _.filter(acceptedRooms, room => {
		return room.my && room.storage && room.terminal &&
			room.terminal.store.getCapacity() > (room.terminal.sum + ENERGY_BALANCE_TRANSFER_AMOUNT) * TARGET_STORAGE_SUM_RATIO &&
			room.storage.store.getCapacity() > (room.storage.sum + ENERGY_BALANCE_TRANSFER_AMOUNT) * TARGET_STORAGE_SUM_RATIO &&
			!room._isReceivingEnergy &&
			room.storage.store[RESOURCE_ENERGY] < MAX_STORAGE_ENERGY[room.controller.level];
	});
	console.log(`requireEnergy ${requiresEnergy}`);


};

viralUtil.terminalFull = function () {

	for (let room of acceptedRooms) {

		let sumTerminal = _.sum(room.terminal.store);

		if (sumTerminal >= room.terminal.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO) {
			console.log(`${room.name} ${sumTerminal / room.terminal.store.getCapacity()}`);
			room.terminalBroker();
		}
	}
};

viralUtil.mineralFull = function () {

	for (let room of acceptedRooms) {

		let mineralType = room.memory.mineralType,
			storageStore = room.storage.store[mineralType],
			terminalStore = room.terminal.store[mineralType];

		if (storageStore && terminalStore)
			console.log(room.name, mineralType);
	}
};

viralUtil.allocatedRooms = function () {

	for (let room of acceptedRooms) {

		let data = room.memory.resources,
			allocatedCompound,
			storageLabs;

		if (!data)
			continue;

		storageLabs = _.filter(data.lab, labs => {
			return labs.reactionState === 'Storage';
		});

		//console.log(`${room.name} ${storageLabs.length}`);

		if (storageLabs.length > 0) {
			allocatedCompound = _.filter(storageLabs.orders, order => {
				return order.type !== 'energy';
			});
		}
		if (allocatedCompound && allocatedCompound.length > 0) {
			global.logSystem(room.name, `${room.name}, ${global.BB(allocatedCompound)}`);
		}
	}
};

viralUtil.terminalOrderToSell = function (roomName) {

	if (_.isUndefined(roomName)) {
		for (let room of myRooms)
			room.terminalOrderToSell();
	} else
		Game.rooms[roomName].terminalOrderToSell();
};

viralUtil.terminalBroker = function (roomName = undefined) {


	if (_.isUndefined(roomName)) {
		for (let room of myRooms) {
			room.terminalBroker();
		}
	} else
		Game.rooms[roomName].terminalBroker();
};

viralUtil.terminalEnergy = () => {

	for (let room of myRooms) {
		if (room.terminal.store[RESOURCE_ENERGY] < 100000)
			console.log(room.name);
	}


};

viralUtil.fixTerminal = function (roomName = undefined) {

	let cleanTerminal = (room) => {
		let data = room.memory.resources,
			terminalMemory = room.memory.resources.terminal[0],
			tOrders,
			terminal = room.terminal;

		console.log(`BEFORE: ${room.name} ${terminalMemory.orders.length}`);

		//global.BB(terminalMemory.orders);

		// TODO is it necessary?
		// garbage collecting offerRoom terminal orders
		if (terminalMemory.orders.length > 0) {
			tOrders = _.filter(terminalMemory.orders, order => {

				console.log(`1., ${room.name} ${order.type} ${_.some(data.offers, offer => {
					return (offer.type === order.type && offer.amount === order.orderRemaining + (terminal.store[offer.type] || 0));
				})}`);

				console.log(`2., ${room.name} ${order.type} ${order.type === room.mineralType && room.storage.store[order.type] >= global.MAX_STORAGE_MINERAL}`);

				console.log(`3., ${room.name} ${order.type} ${order.type.length === 1 && order.type !== room.mineralType && order.type !== RESOURCE_ENERGY && room.storage.store[order.type] >= global.MAX_STORAGE_NOT_ROOM_MINERAL}`);

				console.log(`4., ${room.name} ${order.type} ${global.SELL_COMPOUND[order.type] && global.SELL_COMPOUND[order.type].sell
				&& (global.SELL_COMPOUND[order.type].rooms.length === 0 || _.some(global.SELL_COMPOUND[mineral], {'rooms': room.name}))}`);


				return (order.orderRemaining > 0 || order.storeAmount > 0)
					&& (_.some(data.offers, offer => {
							return (offer.type === order.type && offer.amount === order.orderRemaining + (terminal.store[offer.type] || 0));
						})
						|| (order.type === room.mineralType && room.storage.store[order.type] >= global.MAX_STORAGE_MINERAL)
						|| (order.type.length === 1 && order.type !== room.mineralType && order.type !== RESOURCE_ENERGY && room.storage.store[order.type] >= global.MAX_STORAGE_NOT_ROOM_MINERAL)
						|| (global.SELL_COMPOUND[order.type] && global.SELL_COMPOUND[order.type].sell
							&& (global.SELL_COMPOUND[order.type].rooms.length === 0 || _.some(global.SELL_COMPOUND[mineral], {'rooms': room.name})))
					);
			});
		}

		if (tOrders)
			console.log(`AFTER: ${room.name} ${tOrders.length}`);

		//global.BB(terminalMemory.orders);
	};

	for (let room of myRooms) {
		if (roomName === undefined || room.name === roomName)
			cleanTerminal(room);
	}
};

viralUtil.findOrders = function (roomName) {

	let counter = 0;

	for (let room of myRooms) {

		if (roomName !== undefined && room.name !== roomName)
			continue;

		let data = room.memory.resources,
			terminalOrder = data.terminal[0].orders;

		if (terminalOrder.length > 0) {
			console.log(`${room.name} ${terminalOrder.length}`);
			//global.BB(terminalOrder.slice());
			counter++;
		}
	}

	console.log(counter);
};

viralUtil.compoundMaking = function () {

	let counter = 0;

	for (let room of myRooms) {

		let data = room.memory.resources,
			reactions = data.reactions;

		if (reactions.orders.length > 0) {
			global.logSystem(room.name, `${reactions.orders[0].type} ${reactions.orders[0].amount}`);
			//global.BB(terminalOrder.slice());
			counter++;
		}
	}
	console.log(counter);
};

viralUtil.cancelTerminalOrder = function (roomName) {

	if (roomName === undefined) {
		for (let room of myRooms)
			room.cancelTerminalOrderToSell();
	} else
		Game.rooms[roomName].cancelTerminalOrderToSell();

};

viralUtil.deleteTerminalOrder = function (roomName) {

	if (roomName === undefined) {

		for (let room of myRooms)
			room.memory.resources.terminal[0].orders = [];
	} else
		Game.rooms[roomName].memory.resources.terminal[0].orders = [];

};

viralUtil.lastSales = function () {

	let outgoingTransactions = _.filter(Game.market.outgoingTransactions, transaction => {
		return transaction.resourceType.length === 5;
	});

	for (let transaction of outgoingTransactions) {
		//let transactionObject = outgoingTransactions[transaction];
		console.log(`room: ${transaction.from} resourceType: ${transaction.resourceType} amount: ${transaction.amount} price: ${transaction.order.price}`);
	}

};

viralUtil.cancelMarket = function (mineral) {

	let cancelAllInactiveOrder = function () {

		let inactiveOrders = _.filter(Game.market.orders, order => {
			return !order.active && order.type === 'sell';
		});

		for (let order of inactiveOrders) {

			let resourceType = order.resourceType,
				roomName = order.roomName,
				mineralExist = (this.storage.store[resourceType] || 0) + (this.terminal.store[resourceType] || 0) >= global.SELL_COMPOUND[resourceType].maxStorage + global.MIN_COMPOUND_SELL_AMOUNT;

			if (!mineralExist) {
				global.logSystem(roomName, `Inactive market order found in ${roomName} for ${resourceType}`);
				global.logSystem(roomName, `Order cancelled in ${roomName} for ${resourceType}`);
				Game.market.cancelOrder(order.id);
				numberOfOrders--;
			}
		}
	};
};

viralUtil.look = function (x, y) {

	let pos = new RoomPosition(x, y, 'E25S21'),
		objects = pos.look(),
		noObstacle = !_.some(objects, object => {

			console.log(object.type);

			return object.type === 'creep' || (object.type === 'structure' && OBSTACLE_OBJECT_TYPES.includes(object.structureType)) || (object.type === 'terrain' && object.terrain === 'wall');

		});
	global.BB(objects);

	console.log(`noObstacle: ${_.findIndex(stuff, p => p.type === 'creep' || (p.type === 'structure' && OBSTACLE_OBJECT_TYPES.includes(p.structureType)) || (p.type === 'terrain' && p.terrain === 'wall')) === -1}`);


};

viralUtil.createLab = function (roomName) {

	let create = function (roomName) {

		if (_.isUndefined(Memory.rooms[roomName].resources))
			Memory.rooms[roomName].resources = {};

		Memory.rooms[roomName].resources.lab = [];
		for (let x in Memory.rooms[roomName].labs) {
			let lab = Memory.rooms[roomName].labs[x];
			let obj = {id: lab.id, orders: [], reactionState: 'idle'};
			Memory.rooms[roomName].resources.lab[x] = obj;
		}
	};


	if (roomName === undefined) {

		for (let room of myRooms)
			create(room.name);
	} else
		create(roomName);

};

viralUtil.clearRoomMemory = () => {
	//Memory.pause = true;
	console.log(`${Object.keys(Memory.rooms).length}`);
	Object.keys(Memory.rooms).forEach(room => {

		// TODO check roadConstructionTrace (e.g: reset?), roadConstructionTrace is the biggest, run clean only if it`s enabled
		if (!global.ROAD_CONSTRUCTION_ENABLE) {
			delete Memory.rooms[room].roadConstructionTrace;
		}

		if (!global.SEND_STATISTIC_REPORTS) {
			delete Memory.rooms[room].statistics;
		}

		if (_.isUndefined(Game.rooms[room]) && room !== 'myTotalSites' && room !== 'myTotalStructures') {
			delete Memory.rooms[room];
			// delete Memory.routeRange[room];
			console.log(`${room}`);
		}
	});
	console.log(`${Object.keys(Memory.rooms).length}`);

	//Memory.pause = false;
};

viralUtil.createResources = () => {

	let rooms = _.filter(Game.rooms, (room) => {
		return room.my && room.storage && room.terminal;
	});

	for (let j = 0; j < rooms.length; j++) {
		let room = rooms[j];
		if (room.memory.resources === undefined) {
			room.memory.resources = {
				lab: [],
				powerSpawn: [],
				nuker: [],
				container: [],
				terminal: [],
				storage: [],
				offers: [],
				orders: [],
				reactions: {},
			};
			room.memory.resources.reactions.orders = [];
		}
	}

};

// if second terminal built it deletes, the old id from memory
viralUtil.terminalIdRepair = () => {

	let data;

	for (let room of myRooms) {
		if (Memory.rooms[room.name].resources.terminal.length > 1) {
			console.log(room.name, room.terminal.id);
			delete Memory.rooms[room.name].resources.terminal;
			Memory.rooms[room.name].resources.terminal = [{id: room.terminal.id, orders: []}];

		}
	}

};

viralUtil.rawMemory = () => {

	const numActive = _.size(RawMemory.segments);
	for (let i = 0; i < 100; i++) {
		if (!_.isUndefined(RawMemory.segments[i])) {
			console.log(`id: ${i} RawMemory.segments[i]: ${RawMemory.segments[i]}`);
		}

	}


};

viralUtil.getMyRooms = () => {
	console.log(`myRooms: ${myRooms.length}`);
	for (const room of myRooms) {
		console.log(`room: ${room.name}`);
	}
};

viralUtil.getAcceptedRooms = () => {
	console.log(`myRooms: ${acceptedRooms.length}`);
	for (const room of acceptedRooms) {
		console.log(`room: ${room.name}`);
	}
};

viralUtil.getStoreMinerals = (roomName, compound) => {
	global.logSystem(roomName, `resources: ${Game.rooms[roomName].storedMinerals(compound)}`);
};

viralUtil.getResourcesToAllocate = (roomName, compound) => {
	global.logSystem(roomName, `resources: ${Game.rooms[roomName].resourcesToAllocate(compound)}`);
};

viralUtil.getResourcesAll = (roomName, compound) => {
	global.logSystem(roomName, `resources: ${Game.rooms[roomName].resourcesAll[compound]}`);

};

viralUtil.getResourcesCreeps = (roomName, compound) => {
	console.log(`resourcesCreeps: ${global.json(Game.rooms[roomName].resourcesCreeps)}`);
	global.logSystem(roomName, `resources: ${Game.rooms[roomName].resourcesCreeps[compound]}`);

};

viralUtil.getResourcesOffers = (roomName, compound) => {
	console.log(`resourcesOffers: ${global.json(Game.rooms[roomName].resourcesOffers)}`);
	global.logSystem(roomName, `resources: ${Game.rooms[roomName].resourcesOffers[compound]}`);

};

viralUtil.getResourcesOrders = (roomName, compound) => {
	console.log(`resourcesOrders: ${global.json(Game.rooms[roomName].resourcesOrders)}`);
	global.logSystem(roomName, `resources: ${Game.rooms[roomName].resourcesOrders[compound]}`);

};

viralUtil.getResourcesReactions = (roomName, compound) => {
	console.log(`resourcesReactions: ${global.json(Game.rooms[roomName].resourcesReactions)}`);
	global.logSystem(roomName, `resources: ${Game.rooms[roomName].resourcesReactions[compound]}`);

};

viralUtil.getOrdersPlacedRooms = () => {
	let ordersPlacedRoom = _.filter(myRooms, room => {
		let data = room.memory.resources;
		if (!data || !data.boostTiming)
			return false;
		return data.boostTiming.roomState === 'ordersPlaced';
	});
	console.log(`ordersPlacedRooms: ${global.json(ordersPlacedRoom)}`);
};

viralUtil.checkTerminalOrders = (roomName) => {
	let data = Game.rooms[roomName].memory.resources;
	for (let order of data.terminal[0].orders) {
		global.BB(order);
		if (order.storeAmount === 0)
			order.storeAmount = 100;
	}

};

viralUtil.checkStorageOrders = () => {
	for (let room of acceptedRooms) {
		let data = room.memory.resources;
		for (let order of data.storage[0].orders) {
			if (order.type === 'G')
				console.log(`room: ${room.name}`);
		}
	}
};

viralUtil.checkTerminalOrdersType = () => {

	for (const room of acceptedRooms) {

		let data = room.memory.resources;
		for (let order of data.terminal[0].orders) {
			if (Array.isArray(order)) {
				// order = {};}
				console.log(`room: ${room.name}`);
			}
		}

	}
};

viralUtil.checkCreepNewTarget = (creep) => {
	let sendMineralToTerminal = function (creep) {

			for (const mineral in creep.room.storage.store) {

				let validMineral = viralUtil.checkIsValidMineralToTerminal(creep.room, mineral);

				console.log(`mineral: ${mineral} valid: ${validMineral}`);

				if (creep.carry[mineral] && creep.carry[mineral] > 0 && validMineral)
					return true;
			}
			return false;
		},
		sendEnergyToTerminal = function (creep) {
			return creep.carry.energy > 0 &&
				creep.room.storage.charge > 0.5 &&
				creep.room.terminal.store.energy < TERMINAL_ENERGY * 0.95 &&
				creep.room.terminal.sum < creep.room.terminal.store.getCapacity();
		},
		isValidTarget = function (target) {
			return ((target) && (target.store) && target.active && target.sum < target.store.getCapacity() * TARGET_STORAGE_SUM_RATIO);
		},
		isAddableTarget = function (target, creep) {
			return (target.my &&
				(!target.targetOf || target.targetOf.length < Infinity) &&
				target.sum + creep.carry[RESOURCE_ENERGY] < target.store.getCapacity());
		};


	let mineralToTerminal = sendMineralToTerminal(creep);
	let energyToTerminal = sendEnergyToTerminal(creep);
	global.logSystem(creep.room.name, `sendMineralToTerminal: ${mineralToTerminal}`);
	global.logSystem(creep.room.name, `sendEnergyToTerminal: ${energyToTerminal}`);


	if (creep.room.terminal && creep.room.terminal.active &&
		(mineralToTerminal || energyToTerminal)
		&& isAddableTarget(creep.room.terminal, creep)) {
		return creep.room.terminal;
	} else if (isValidTarget(creep.room.storage) && this.isAddableTarget(creep.room.storage, creep))
		return creep.room.storage;

	return null;
};

viralUtil.getResourcesAllButMe = (roomName, compound) => {
	global.logSystem(roomName, `resourcesAllButMe: ${Game.rooms[roomName].resourcesAllButMe(compound)}`);
};

viralUtil.checkCompoundThreshold = () => {
	for (const room of acceptedRooms) {
		for (const compound in Memory.compoundsToAllocate) {
			let compoundObject = Memory.compoundsToAllocate[compound];
			if (compoundObject.allocate) {
				if ((room.resourcesAll[compound] || 0) < Memory.compoundsToAllocate[compound].roomThreshold)
					global.logSystem(room.name, `${compound}: ${room.resourcesAll[compound] || 0}`);
			}

		}
	}
};

viralUtil.findRoomToTransfer = () => {
	let storedEnergy = Infinity,
		ret;
	for (const room of myRooms) {
		if (room.storage.store.energy < storedEnergy) {
			storedEnergy = room.storage.store.energy;
			ret = room.name;
		}
	}

	return ret;
};

viralUtil.deleteInvadersCore = () => {
	for (let room in Memory.rooms) {
		let currentRoom = Memory.rooms[room];
		if (currentRoom.invadersCore) {
			console.log(`room: ${room}`);
			delete currentRoom.invadersCore;
		}
	}
};

viralUtil.isValidMineralToTerminal = () => {

	for (const room of acceptedRooms) {

		console.log(`ROOM: ${room.name}`);

		let ret = false;

		for (const [mineral, amount] of Object.entries(room.storage.store)) {

			if (mineral === RESOURCE_ENERGY)
				continue;

			let mineralIsCompound = mineral.length > 1 || mineral === RESOURCE_GHODIUM;
			let ret = false;
			let storageFull = room.storage.sum >= room.storage.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO;
			let terminalHaveFreeSpace = room.terminal.sum - room.terminal.store.energy
				+ Math.max(room.terminal.store.energy, global.TERMINAL_ENERGY) < room.terminal.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO;
			let storedMineral = room.storage.store[mineral];

			if (!mineralIsCompound) {
				if (mineral === room.mineralType) {
					ret = (storedMineral || 0)
						// storage near to full or stored too much mineral
						&& (storageFull || storedMineral > global.MAX_STORAGE_MINERAL)
						// terminal not stored more mineral than global.MAX_TERMINAL_MINERAL
						&& room.terminal.sum - room.terminal.store.energy + global.TERMINAL_ENERGY < global.MAX_TERMINAL_MINERAL
						// terminal have more than 30.000 free space
						&& terminalHaveFreeSpace;
					if (ret)
						global.logSystem(room.name, `isValidToTerminal ROOM Mineral: ${mineral} amount: ${amount - global.MAX_STORAGE_MINERAL}`);

				} else {
					ret = storedMineral
						&& (storageFull || storedMineral > global.MAX_STORAGE_NOT_ROOM_MINERAL)
						&& room.terminal.sum - room.terminal.store.energy + global.TERMINAL_ENERGY < global.MAX_TERMINAL_MINERAL
						&& terminalHaveFreeSpace;
					if (ret)
						global.logSystem(room.name, `isValidToTerminal NOT ROOM Mineral: ${mineral} amount: ${amount - global.MAX_STORAGE_NOT_ROOM_MINERAL}`);
				}

			} else if (global.SELL_COMPOUND[mineral] && global.SELL_COMPOUND[mineral].sell) {
				ret = (storedMineral || 0)
					&& (storageFull || storedMineral > global.SELL_COMPOUND[mineral].maxStorage)
					&& room.terminal.sum - room.terminal.store.energy + global.TERMINAL_ENERGY < global.MAX_TERMINAL_MINERAL
					&& terminalHaveFreeSpace;
				if (ret)
					global.logSystem(room.name, `isValidToTerminal COMPOUND: ${mineral} amount: ${amount - global.SELL_COMPOUND[mineral].maxStorage}`);
			}
		}
	}
};

viralUtil.allCompounds = (roomName) => {
	let allCompounds = {};
	for (const compound of global.ALL_COMPOUNDS) {
		global.logSystem(roomName, `${compound}: ${Game.rooms[roomName].resourcesAll[compound]}`);
		allCompounds = Object.assign(allCompounds, {
			[compound]: Game.rooms[roomName].resourcesAll[compound],
		});
	}
	global.logSystem(roomName, `${global.json(allCompounds)}`);
};

viralUtil.sellOrders = (mineral) => {
	console.log(`sell orders for ${mineral}:`);
	console.log(`${global.json(global.marketOrders(mineral))}`);
};

viralUtil.buyOrders = (mineral) => {
	console.log(`buy orders for ${mineral}:`);
	console.log(`${global.json(global.marketOrders(mineral, false))}`);
};

viralUtil.energyPrice = () => {
	let allHistory = Game.market.getHistory(RESOURCE_ENERGY);

	console.log(`history: ${global.json(allHistory)} length: ${allHistory.length}`);

	console.log(`price0: ${global.json(allHistory.slice(-1))}`);

	console.log(`price: ${global.json(energyPrice)}`);

	console.log(`history: ${global.json(allHistory)} length: ${allHistory.length}`);
};

viralUtil.memorySize = () => {
	let memorySize = RawMemory.get().length;
	console.log(`memory size: ${memorySize} bytes`);
	console.log(`memory size: ${global.round(memorySize / 1024)} KB`);
};

viralUtil.freeSpace = (roomName) => {
	let room = Game.rooms[roomName],
		terminalFreeSpace = room.terminal.store.getFreeCapacity(),
		storageFreeSpace = room.storage.store.getFreeCapacity(),
		isFreeSpace = terminalFreeSpace > global.terminalCapacity * (1 - global.TARGET_STORAGE_SUM_RATIO) || storageFreeSpace > global.storageCapacity * (1 - global.TARGET_STORAGE_SUM_RATIO);


	console.log(`terminalCapacity: ${global.terminalCapacity}`);
	console.log(`storageCapacity: ${global.storageCapacity}`);
	console.log(`terminalFreeSpace: ${terminalFreeSpace}`);
	console.log(`storageFreeSpace: ${storageFreeSpace}`);
	console.log(`freeSpace: ${isFreeSpace}`);

};

viralUtil.requiresEnergyRoom = () => {

	for (let roomFrom of global.acceptedRooms) {
		let transacting = false;

		let offerRoomCharge = global.Util.chargeScale(roomFrom.storage.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT,
			global.MIN_STORAGE_ENERGY[roomFrom.controller.level],
			global.MAX_STORAGE_ENERGY[roomFrom.controller.level]);

		global.logSystem(roomFrom.name, `stored: ${roomFrom.storage.store.energy} chargeScale: ${offerRoomCharge}`);

		if (roomFrom.controller.level === 8 && !transacting && offerRoomCharge > 0.8 && roomFrom.terminal.store.energy > global.ENERGY_BALANCE_TRANSFER_AMOUNT * 1.1) {

			global.logSystem(offerRoomCharge.name, `can transfer energy`);

			let requiresEnergy = room => (
				room.terminal.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO > room.terminal.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT
				&& room.storage.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO > room.storage.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT
				&& !room._isReceivingEnergy && room.name !== roomFrom.name
				&& room.storage.store[RESOURCE_ENERGY] < global.MAX_STORAGE_ENERGY[room.controller.level] + global.TERMINAL_ENERGY - room.terminal.store.energy
			);

			let targetRooms = _.filter(acceptedRooms, requiresEnergy);

			for (const targetRoom of targetRooms) {
				console.log(`targetRooms: ${targetRoom.name} ${targetRoom.storage.store.energy}`);
			}


			let targetRoom = _.min(targetRooms, 'storage.store.energy');

			console.log(`targetRoom: ${global.json(targetRoom)}`);

			if (targetRoom instanceof Room) {

				let transAction = function() {
					global.logSystem(roomFrom.name, `TARGET_ROOM: ${targetRoom.name}`);

					targetRoom._isReceivingEnergy = true;

					// let response = that.terminal.send('energy', transactionAmount, targetRoom.name, 'have fun');

					if (global.DEBUG)
						global.logSystem(roomFrom.name, `Transferring ${global.Util.formatNumber(transactionAmount)} energy to ${targetRoom.name} ${targetRoomCharge}`);

					transacting = true;
				};

				let transactionCost = Game.market.calcTransactionCost(global.ENERGY_BALANCE_TRANSFER_AMOUNT, roomFrom.name, targetRoom.name);
				let transactionAmount = global.ENERGY_BALANCE_TRANSFER_AMOUNT;

				let targetRoomCharge = global.Util.chargeScale(targetRoom.storage.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT,
					global.MIN_STORAGE_ENERGY[targetRoom.controller.level],
					global.MAX_STORAGE_ENERGY[targetRoom.controller.level]);

				if (targetRoomCharge < 0.5 && transactionCost > (roomFrom.terminal.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT)) {
					transactionAmount = global.changeAmount(roomFrom.name, targetRoom.name, global.ENERGY_BALANCE_TRANSFER_AMOUNT, roomFrom.terminal.store.energy, true);
					transAction();
				}
				else if (transactionCost < (roomFrom.terminal.store.energy - global.ENERGY_BALANCE_TRANSFER_AMOUNT)) {
					transAction();
				}

			} else {
				global.logSystem(roomFrom.name, `NO ENERGY TRANSFER`);
			}
		}
	}
};

viralUtil.energyCalc = (amount, distance) => {
	let euler = Math.exp(distance / 30),
		transActionAmount = (amount * euler) / (2 * euler - 1),
		transActionCost = (amount * (euler - 1)) / (2 * euler - 1);


	console.log(`amount: ${transActionAmount} cost: ${transActionCost}`);

};

viralUtil.requiresEnergy = (roomName) => {

	let room = Game.rooms[roomName];

	let requiresEnergy = room => (
		room.terminal.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO > room.terminal.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT
		&& room.storage.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO > room.storage.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT
		&& !room._isReceivingEnergy
		&& room.storage.store.energy < global.MAX_STORAGE_ENERGY[room.controller.level]
	);

	console.log(`${room.terminal.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO > room.terminal.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT}`);
	console.log(`${room.storage.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO > room.storage.sum + global.ENERGY_BALANCE_TRANSFER_AMOUNT}`);
	console.log(`${!room._isReceivingEnergy}`);
	console.log(`${room.storage.store.energy < global.MAX_STORAGE_ENERGY[room.controller.level]}`);

	let targetRooms = _.filter(acceptedRooms, requiresEnergy);

	for (const targetRoom of targetRooms)
		console.log(`targetRooms: ${targetRoom.name} ${targetRoom.storage.store.energy}`);

	let targetRoom = _.min(targetRooms, 'storage.store.energy');
	if (targetRoom instanceof Room)
		console.log(`TARGET ROOM: ${targetRoom.name}`);
	else
		console.log(`NO TRANSFER`);
};


// HERE comes room.memory.resources

/*
Orders[
{id:, type:, amount:, offers[amount:, room:]}
]

Offers [
{id:, type:, amount:, room:}
]

reactions {
orders[id: type: mode: amount:], reactorType:, seed_a:, seed_b:, reactorMode:
}

candidates [
{room:, readyOffers:}
]


boostTiming {


ordersPlaced:
reactionMaking:
checkRoomAt:
orderAttempt:
ordersReady = {
                time: Game.time,
                orderCandidates: [{room: offer.room, readyOffers: readyOffersFound}]
            };

}

terminal[
id:
orders[
{type: orderamount: orderRemaining: storeAmount:}
]
]
 */


module.exports = viralUtil;
