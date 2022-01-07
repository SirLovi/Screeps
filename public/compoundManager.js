'use strict';

let mod = {};
module.exports = mod;

mod.plan = {};
mod.sellOrders = {};
mod.completedDeal = 0;


mod.run = () => {

	// write basic parameters to Memory (if COMPOUNDS_MANAGE modified -> delete Memory.compoundsManage)
	mod.writeAllocateParametersToMemory();

	if (!global.COMPOUNDS_MANAGE_ENABLED || Game.time % global.COMPOUNDS_MANAGE_TIMING !== 0)
		return;

	console.log(`COMPOUND MANAGER`);

	mod.sellOrders = global.sellOrders;
	mod.completedDeal = 0;

	// if (_.isUndefined(Memory.compoundsPlan)) {
	// 	console.log(`Init compoundsPlan`);
	// 	Memory.compoundsPlan = {};
	// 	mod.plan = Memory.compoundsPlan;
	// 	mod.buildPlanObject();
	// } else {
	// 	console.log(`compoundsPlan exist`);
	// 	mod.plan = Memory.compoundsPlan;
	// }



	if (_.isUndefined(Memory.compoundsPlan)) {
		console.log(`building plan object`);
		mod.buildPlanObject();
		console.log(`create plans`);
		mod.buildPlan();
		console.log(`write plan to memory`);
		mod.writePlanToMemory();
	}
};

mod.buildPlanObject = (roomName) => {

	let createObject = function (roomName) {

		mod.plan[roomName] = {};

		mod.plan[roomName] = Object.assign(mod.plan[roomName], {
			need: {},
			reaction: {},
			orders: [],
			offers: [],
			roomResources: {},
			empireResources: {},
			planMade: false,
		});

		for (const compound of global.ALL_COMPOUNDS) {
			let resourcesToAllocate = Game.rooms[roomName].resourcesToAllocate(compound);
			resourcesToAllocate = resourcesToAllocate === 0 ? undefined : resourcesToAllocate;
			mod.plan[roomName].empireResources = Object.assign(mod.plan[roomName].empireResources, {
				[compound]: resourcesToAllocate,
			});

			mod.plan[roomName].roomResources = Object.assign(mod.plan[roomName].roomResources, {
				[compound]: Game.rooms[roomName].resourcesAll[compound],
			});
		}
	};


	if (_.isUndefined(roomName)) {
		for (const room of acceptedRooms)
			createObject(room.name);
	} else
		createObject(roomName);


};

mod.buildPlan = () => {

	for (let [roomName, roomData] of Object.entries(mod.plan)) {

		global.logSystem(roomName, `plan can be made: ${!roomData.planMade && Game.cpu.bucket > global.COMPOUNDS_MANAGE_BUCKET} bucket: ${Game.cpu.bucket}`);

		if (!roomData.planMade && Game.cpu.bucket > global.COMPOUNDS_MANAGE_BUCKET) {

			for (const [compoundName, compoundData] of Object.entries(Memory.compoundsManage)) {

				// global.logSystem(roomName, `planMade: ${roomData.planMade} bucket: ${Game.cpu.bucket}`);

				// get what need for the roomName
				if (mod.roomNeed(roomName, compoundName, compoundData)) {

					let compound = roomData.need.type,
						amount = roomData.need.amount;

					global.logSystem(roomName, `need: ${amount} ${compound}`);

					if (mod.manageCompounds(roomName, compound, amount)) {

						let reaction = mod.plan[roomName].reaction;

						// if (roomName === 'E29S17') {
						// 	global.logSystem(roomName, `reaction: ${reaction} reaction json: ${global.json(reaction)} keys: ${Object.keys(reaction).length}`);
						// }

						if (Object.keys(reaction).length === 0) {
							let orders = mod.plan[roomName].orders[0];
							global.logSystem(roomName, `plan made => ordered ${orders.amount} ${orders.type}`);

						} else {
							global.logSystem(roomName, `plan made => place reaction for ${reaction.amount} ${reaction.type}`);
						}

						mod.plan[roomName].planMade = true;
						break;
					}
				}
			}
		}
	}
};

mod.roomNeed = (roomName, compoundName, compoundData) => {
	let roomStore = mod.plan[roomName].roomResources[compoundName] || 0,
		amount = compoundData.roomThreshold + compoundData.reservedAmount - roomStore;

	// global.logSystem(roomName, `roomStore: ${roomStore} need: ${compoundData.roomThreshold + compoundData.reservedAmount}`);

	if (amount > 0) {
		mod.plan[roomName].need = {
			type: compoundName,
			amount: global.roundUpTo(amount, global.MIN_OFFER_AMOUNT),
		};
		return true;
	} else
		return false;
};

mod.manageCompounds = (roomName, compound, amount) => {

	let product = mod.getProductTree(roomName, compound, amount);

	for (const [currentCompound, ingredients] of Object.entries(product)) {

		if (mod.isMainCompoundAllocatable(roomName, amount, compound, currentCompound))
			return true;

		global.logSystem(roomName, `ingredients: ${global.json(ingredients)}`);

		let [allocatable, purchase] = mod.getIngredients(roomName, ingredients);

		if (allocatable === true || purchase === true)
			return true;

		// we can make reactions for [currentCompound], no need to buy, just allocate
		if (purchase.length === 0) {
			if (allocatable.length > 0) {
				for (const allocateCompound of allocatable) {
					mod.plan[roomName].orders.push({
							id: global.guid(),
							type: allocateCompound.ingredient,
							amount: allocateCompound.amount,
							offers: [],
						},
					);
					// mod.plan[roomName].tempOrders = _.cloneDeep(mod.plan[roomName].orders);
					mod.updateResources(roomName, allocateCompound.ingredient, allocateCompound.amount);
				}
			}
			global.logSystem(roomName, `amount: ${amount} compound: ${compound} currentCompound: ${currentCompound} allocatable: ${global.json(allocatable)}`);
			mod.makeReaction(roomName, currentCompound, compound, amount, allocatable);
			// mod.plan[roomName].planMade = true;
			return true;

		} else {
			// we must purchase elements from purchase[]
			global.logSystem(roomName, `purchase: ${global.json(purchase)}`);
			let purchaseSucceed = mod.purchaseMinerals(purchase);
			if (purchaseSucceed) {
				mod.makeReaction(roomName, currentCompound, compound, amount, allocatable, true);
				// mod.plan[roomName].planMade = true;
				return true;
			} else
				return false;
		}
	}

	// global.logSystem(roomName, `reaction: ${global.json(mod.plan[roomName].reaction)}`);
	// global.logSystem(roomName, `orders: ${global.json(mod.plan[roomName].orders)}`);
};

mod.isMainCompoundAllocatable = (roomName, amount, compound, currentCompound) => {
	// main compound can be allocated
	if (currentCompound === compound && mod.isAllocatable(roomName, currentCompound, amount)) {
		global.logSystem(roomName, `main reaction: ${amount} ${currentCompound} is allocatable -> make order, no need to made it`);
		mod.plan[roomName].orders.push({
				id: global.guid(),
				type: compound,
				amount: amount,
				offers: [],
			},
		);
		// mod.plan[roomName].tempOrders = _.cloneDeep(mod.plan[roomName].orders);
		mod.updateResources(roomName, compound, amount);
		return true;
		// make main compound
	} else if (currentCompound === compound) {
		global.logSystem(roomName, `main reaction: ${amount} ${currentCompound}`);
		// make sub compound
	} else {
		global.logSystem(roomName, `sub reaction: ${currentCompound}`);
	}

	return false;
};

mod.getSellOrders = (amount, mineral, roomName) => {

	let allOrders = global.marketOrders(mineral)

	return _.filter(allOrders, o => {

		let transactionCost,
			credits;

		if (o.amount <= 0)
			return false;

		o.transactionAmount = Math.min(o.amount, amount);

		transactionCost = Game.market.calcTransactionCost(o.transactionAmount, o.roomName, roomName);

		if (transactionCost > Game.rooms[roomName].terminal.store[RESOURCE_ENERGY])
			return false;

		credits = o.transactionAmount * o.price;

		if (Game.market.credits < credits) {
			o.transactionAmount = Game.market.credits / o.price;
			if (o.transactionAmount === 0)
				return false;
		}
		o.ratio = (credits + (transactionCost * global.energyPrice)) / o.transactionAmount;

		return o.transactionAmount >= global.MIN_OFFER_AMOUNT;
	});



};

mod.updateSellOrders = (id, amount) => {
	let idx = _.findIndex(mod.sellOrders, order => {
		return order.id === id;
	});

	mod.sellOrders[idx].amount -= amount;
};

mod.purchaseMinerals = (purchase) => {


	// amount = what`s available to purchase right now in the terminal
	// remainingAmount = What`s 'remaining' of the originally placed order, before it is fulfilled, regardless of what is available in the terminal
	// Wiki plug! https://wiki.screepspl.us/index.php/Market


	let numberOfPurchase = purchase.length;

	for (const [idx, item] of purchase.entries()) {

	}

	let roomName = purchase[0].roomName,
		amount = purchase[0].amount,
		mineral = purchase[0].ingredient,
		room = Game.rooms[roomName];

	if (!global.PURCHASE_MINERALS) {
		if (global.DEBUG)
			console.log(`${roomName} needs to buy ${amount} ${mineral} but PURCHASE_MINERALS is false`);
		return false;
	}

	if (room.storage.charge < global.STORE_CHARGE_PURCHASE) {
		if (global.DEBUG)
			console.log(`storage.charge in ${roomName} is ${room.storage.charge}, purchase for ${mineral} is delayed`);
		return false;
	}

	if (room.terminal.cooldown > 0) {
		if (global.DEBUG)
			console.log(`terminal.coolDown in ${roomName} is ${room.terminal.cooldown}, purchase for ${mineral} is delayed`);
		return false;
	}

	if (global.DEBUG)
		console.log(`try to buy ${amount} ${mineral} in ${roomName}`);

	let resOrders = mod.getSellOrders(amount, mineral, roomName);

	if (resOrders.length > 0) {

		let order = _.min(resOrders, 'ratio'),
			returnValue;

		console.log('selected order: ');
		global.logSystem(roomName, `${order.id} ${order.amount} ${mineral}, we need ${amount}`);

		if (mod.completedDeal < 10) {
			returnValue = Game.market.deal(order.id, order.transactionAmount, roomName);
		} else {
			global.logSystem(roomName, `maximum number of deals reached`);
			return false;
		}

		if (returnValue === OK) {
			mod.completedDeal++;
			mod.updateSellOrders(order.id, order.transactionAmount);
			if (order.transactionAmount === amount) {
				global.logSystem(roomName, `Purchased ${order.transactionAmount} ${mineral} at price: ${order.price} it costs: ${order.transactionAmount * order.price}`);
				if (purchase.length === 1) {
					return true;
				} else {
					global.logSystem(roomName, `there are more then one mineral to buy => bought: ${order.transactionAmount} ${mineral} remains: ${purchase[1].amount} ${purchase[1].ingredient} => move to next compoundToManage`);
					return false;
				}
			} else {
				global.logSystem(roomName, `Purchased ${order.transactionAmount} ${mineral} at price: ${order.price} it costs: ${order.transactionAmount * order.price}`);
				global.logSystem(roomName, `${amount - order.transactionAmount} ${mineral}, left for buying => move to next compoundToManage`);
				return false;
			}
		} else {
			global.logSystem(roomName, `purchase was FAILED error code: ${global.translateErrorCode(returnValue)}`);
			return false;
		}
	} else {
		console.log(`No sell order found for ${mineral}`);
		return false;
	}

};

mod.getIngredients = (roomName, ingredients) => {

	let allocatable = [],
		purchase = [];

	for (const [ingredient, amount] of Object.entries(ingredients)) {

		if (mod.isAllocatable(roomName, ingredient, amount)) {
			if (amount > 0) {

				if (ingredient.length === 1 && ingredient !== 'G')
					global.logSystem(roomName, `${amount} ${ingredient} is ALLOCATABLE -> make roomOrder, no need to purchase it`);
				else
					global.logSystem(roomName, `${amount} ${ingredient} is ALLOCATABLE -> make roomOrder, no need to make it`);

				allocatable.push({
					ingredient: ingredient,
					amount: amount,
				});

			} else {

				global.logSystem(roomName, `${ingredient} -> we HAVE enough, no need to order/make`);

			}
		} else if (ingredient.length === 1 && ingredient !== 'G') {
			global.logSystem(roomName, `${ingredient} -> do NOT have enough, we have to buy ${amount}`);

			purchase.push({
				roomName: roomName,
				mineral: ingredient,
				amount: amount,
			});

		} else {

			// mod.buildPlanObject(roomName);

			mod.plan[roomName].need = {
				type: ingredient,
				amount: global.roundUpTo(amount, global.MIN_OFFER_AMOUNT),
			};

			let roomNeed = mod.plan[roomName].need;

			global.logSystem(roomName, `room needs sub compound: ${roomNeed.amount} ${roomNeed.type}`);

			if (mod.manageCompounds(roomName, roomNeed.type, roomNeed.amount)) {
				global.logSystem(roomName, `reaction CHANGED to: ${roomNeed.amount} ${roomNeed.type}`);
				return [true, true];
			} else
				global.logSystem(roomName, `reaction CAN NOT CHANGE to: ${roomNeed.amount} ${roomNeed.type}`);
		}
	}

	return [allocatable, purchase];
};

mod.isAllocatable = (roomName, ingredient, amount) => {

	let empireResources = mod.plan[roomName].empireResources[ingredient] || 0;

	// global.logSystem(roomName, `ingredient: ${ingredient} amount: ${amount} isAllocatable: ${isAllocatable}`);

	return amount >= 0 && amount <= empireResources;

};

mod.updateRoomOrders = (roomName) => {

	let orders = mod.plan[roomName].orders;

	for (let [orderIdx, order] of orders.entries()) {

		let amountRemaining = order.amount;

		// delete remoteRoom.offers if they do not have a match with roomName.order.offers

		// for (let [offerIdx, offer] of order.offers.entries()) {
		// 	let remoteOffers = mod.plan[offer.room].offers,
		// 		remoteOfferIdx = remoteOffers.indexOf(offer => {
		// 			return offer.room === roomName && offer.id === order.id && offer.type === order.type;
		// 		});
		// 	if (remoteOfferIdx !== -1) {
		// 		remoteOffers.splice(remoteOfferIdx, 1);
		// 		offerIdx--;
		// 	}
		//
		// }

		if (amountRemaining <= 0) {
			orders.splice(orderIdx--, 1);
		} else {

			let offeringRooms = _.filter(Object.keys(mod.plan), room => {
				return room !== roomName;
			});

			// global.logSystem(roomName, `${global.json(offeringRooms)}`);

			offeringRooms.sort((a, b) => {
				return Game.map.getRoomLinearDistance(roomName, a, true) - Game.map.getRoomLinearDistance(roomName, b, true);
			});

			// global.logSystem(roomName, `offeringRooms: ${global.json(offeringRooms)}`);

			for (const offerRoom of offeringRooms) {

				let remoteOffers = mod.plan[offerRoom].offers,
					remoteResources = mod.plan[offerRoom].roomResources[order.type] || 0;

				// if (remoteOffers.length > 0)
				// 	isAllocatable = (offerRoomData.roomResources[order.type] || 0) - (global.sumCompoundType(remoteOffers)[order.type] || 0);
				// else

				// for COMPOUNDS_MANAGE
				if (global.isCompoundToManage(order.type)) {

					let roomThreshold = Memory.compoundsManage[order.type].roomThreshold;

					remoteResources = remoteResources - roomThreshold;

				}

				if (remoteResources < global.MIN_OFFER_AMOUNT)
					continue;

				if (amountRemaining < global.MIN_OFFER_AMOUNT && amountRemaining > 0)
					amountRemaining = global.MIN_OFFER_AMOUNT;

				remoteResources = Math.min(remoteResources, amountRemaining);

				// let existingOffer = order.offers.find(offer => {
				// 		return offer.room === roomName;
				// 	}),
				// 	existingRemoteOffer = remoteOffers.find(offer => {
				// 		return offer.room === roomName && offer.id === order.id && offer.type === order.type;
				// 	});
				//
				// if (existingOffer) {
				// 	amountRemaining -= (remoteResources - existingOffer.amount);
				// 	existingOffer.amount = remoteResources;
				// } else {
				// 	amountRemaining -= remoteResources;
				// 	order.offers.push({
				// 		room: roomName,
				// 		amount: remoteResources,
				// 	});
				// }
				// if (existingRemoteOffer) {
				// 	existingRemoteOffer.amount = remoteResources;
				// } else {
				// 	remoteOffers.push({
				// 		room: roomName,
				// 		id: order.id,
				// 		type: order.type,
				// 		amount: remoteResources,
				// 	});
				// }

				amountRemaining -= remoteResources;
				order.offers.push({
					room: offerRoom,
					amount: remoteResources,
				});

				remoteOffers.push({
					room: roomName,
					id: order.id,
					type: order.type,
					amount: remoteResources,
				});


				global.logSystem(roomName, `orders: ${global.json(mod.plan[roomName].orders)}`);

				global.logSystem(offerRoom, `remoteOffer: ${global.json(mod.plan[offerRoom].offers)}`);

				global.logSystem(offerRoom, `roomResources amount ${order.type} BEFORE update: ${mod.plan[offerRoom].roomResources[order.type]}`);

				mod.plan[offerRoom].roomResources[order.type] -= remoteResources;

				global.logSystem(offerRoom, `roomResources ${order.type} AFTER update: ${mod.plan[offerRoom].roomResources[order.type]}`);

				if (amountRemaining <= 0) {
					break;
				}
			}
		}
	}

};

mod.updateResources = (roomName, compound, amount) => {
	mod.updateRoomOrders(roomName);
	global.logSystem(roomName, `empireResources ${compound} BEFORE update: ${mod.plan[roomName].empireResources[compound]}`);
	for (const [roomName, roomData] of Object.entries(mod.plan)) {
		roomData.empireResources[compound] -= amount;
		roomData.empireResources[compound] = roomData.empireResources[compound] < 0 ? 0 : roomData.empireResources[compound];
	}
	global.logSystem(roomName, `empireResources ${compound} AFTER update: ${mod.plan[roomName].empireResources[compound]}`);

};

mod.getProductTree = (roomName, compound, amount) => {

	if (compound.length === 1 && compound !== 'G')
		return;

	if (compound === 'power')
		return;

	if (amount < global.MIN_COMPOUND_AMOUNT_TO_MAKE)
		amount = global.MIN_COMPOUND_AMOUNT_TO_MAKE;

	let ingredientNeeds = function (compound, amount) {
			// this amount has to be produced/ordered in this room

			let
				storedRoom = mod.plan[roomName].roomResources[compound] || 0,
				ingredientAmount = amount - storedRoom;

			ingredientAmount < 0 ? ingredientAmount = 0 : ingredientAmount;

			return global.roundUpTo(ingredientAmount, global.MIN_OFFER_AMOUNT);
		},
		findIngredients = function (compound, amount) {

			let ingredientA = (global.LAB_REACTIONS[compound][0]),
				ingredientB = (global.LAB_REACTIONS[compound][1]),
				ret = {
					[ingredientA]: ingredientNeeds(ingredientA, amount),
					[ingredientB]: ingredientNeeds(ingredientB, amount),
				};

			// global.logSystem(roomName, `findIngredients for ${compound}: ${global.json(ret)}`);

			return ret;
		},
		slicer = function (compound, amount) {

			let product = {},
				returnValue = {},
				slice = function (stuff) {
					if (Object.keys(stuff).length === 0)
						return false;
					else
						return stuff;
				};

			product[compound] = findIngredients(compound, amount);
			Object.keys(product).forEach(ingredients => {
				Object.keys(product[ingredients]).forEach(ingredient => {

					if (ingredient.length > 1 || ingredient === 'G')
						returnValue[ingredient] = product[ingredients][ingredient];

				});
			});

			return {
				product: product,
				slice: slice(returnValue),
			};
		},
		returnObject = slicer(compound, amount),
		product = returnObject.product,
		slices = returnObject.slice;

	do {
		let returnArray = [];

		Object.keys(slices).forEach(slice => {
			returnObject = slicer(slice, slices[slice]);
			product[slice] = returnObject.product[slice];
			returnArray.push(returnObject.slice);
		});

		slices = {};
		for (let slice of returnArray)
			slices = Object.assign(slices, slice);

	} while (_.some(slices, Object));

	return product;
};

mod.makeReaction = (roomName, currentCompound, compound, amount, allocatable, purchase = false) => {

	let reaction;

	if (currentCompound === compound) {
		reaction = {
			type: compound,
			amount: amount,
		};
	} else {

		let reactionAmount;

		if (!purchase) {
			if (allocatable.length > 1)
				reactionAmount = _.max(mod.plan[roomName].orders, 'amount');
			else if (allocatable.length === 1)
				reactionAmount = mod.plan[roomName].orders[0].amount;
			else
				reactionAmount = amount;
		} else {
			reactionAmount = amount;
		}

		reaction = {
			type: currentCompound,
			amount: reactionAmount,
		};
	}

	mod.plan[roomName].reaction = {
		id: global.guid(),
		type: reaction.type,
		amount: reaction.amount,
	};
};

mod.writePlanToMemory = () => {

	console.log(`PLAN LENGTH: ${Object.keys(mod.plan).length}`);

	Memory.compoundsPlan = mod.plan;

	// for (const [room, data] of Object.entries(mod.plan)) {
	// 	global.logSystem(room, `reaction: ${global.json(mod.plan[room].reaction)}`);
	// 	global.logSystem(room, `orders: ${global.json(mod.plan[room].orders)}`);
	// 	global.logSystem(room, `offers: ${global.json(mod.plan[room].offers)}`);
	// 	global.logSystem(room, `planMade: ${global.json(mod.plan[room].planMade)}`);
	// 	console.log(`\n`);
	//
	// }

};

mod.writeAllocateParametersToMemory = () => {

	if (_.isUndefined(Memory.compoundsManage)) {
		console.log(`Writing compoundsManage to Memory`);
		Memory.compoundsManage = global.COMPOUNDS_MANAGE;
	}
};



