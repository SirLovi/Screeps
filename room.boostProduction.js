'use strict';

let mod = {
	analyze() {
		this.boostProduction();
	},
	boostProduction() {

		if (!global.MAKE_COMPOUNDS) {
			return;
		}

		let roomTrading = Memory.boostTiming.roomTrading;

		if (roomTrading.boostAllocation)
			return;

		// make compounds
		if (Game.time % global.MAKE_COMPOUNDS_INTERVAL === 0) {

			let orderingRoom = global.orderingRoom(),
				ordersPlacedRoom = _.some(myRooms, room => {
					let data = room.memory.resources;
					if (!data || !data.boostTiming)
						return false;
					return data.boostTiming.roomState === 'ordersPlaced';
				}),
				numberOfOrderingRooms = orderingRoom.length,
				roomFound = false;

			for (let room of myRooms) {

				let data = room.memory.resources;

				if (global.AUTO_REGISTER_LABS)
					room.autoRegisterLabs();

				if (_.isUndefined(data) || _.isUndefined(data.reactions))
					continue;

				let boostTiming = data.boostTiming,
					checkOrdersPlacedRoom = false,
					reactionMakingStarted = function () {
						return data.reactions.orders.length === 1 && _.sum(data.orders, 'amount') === 0;

						// let reactionCompound = data.reactions.orders[0].type,
						//     storageLabs = _.filter(data.lab, lab => {
						//         return lab.reactionState === 'Storage';
						//     }).length,
						//     workingLabs = _.filter(data.lab, lab => {
						//         if (lab.id === data.reactions.seed_a || lab.id === data.reactions.seed_b || lab.reactionState === 'Storage')
						//             return false;
						//         let labObject = Game.getObjectById(lab.id);
						//         return labObject.mineralType === reactionCompound && labObject.mineralAmount >= LAB_REACTION_AMOUNT;
						//     }).length;
						//
						// return workingLabs === data.lab.length - 2 - storageLabs;
					};

				global.logSystem(room.name, `orderingRoom - room[0]: ${orderingRoom[0]} length: ${numberOfOrderingRooms} roomFound: ${roomFound}`);
				// ordersPlaced => reactionMaking
				if (data.orders.length === 0 || _.sum(data.orders, 'amount') <= 0) {

					if (boostTiming.roomState === 'ordersPlaced') {
						let reactionMaking = reactionMakingStarted();
						if (reactionMaking) {
							boostTiming.roomState = 'reactionMaking';
							boostTiming.checkRoomAt = Game.time;
							delete boostTiming.getOfferAttempts;
							global.logSystem(room.name, `${room.name} orders done, reaction started`);
						} else if (Object.keys(boostTiming).length > 2 || boostTiming.checkRoomAt >= Game.time + global.CHECK_ORDERS_INTERVAL)
							checkOrdersPlacedRoom = true;
					}
				}
				// new line
				if (boostTiming && Game.time >= boostTiming.checkRoomAt && room.structures.labs.all.length !== room.structures.labs.storage.length - 2) {

					// new line
					//global.logSystem(room.name, `LABS - all: ${room.structures.labs.all.length}, storage: ${room.structures.labs.storage.length}`);

					// reactionMakingRooms
					if (data.boostTiming.roomState === 'reactionMaking') {

						if (_.sum(data.reactions.orders, 'amount') > 0) {
							boostTiming.reactionMaking = Game.time;
							room.countCheckRoomAt();
							global.logSystem(room.name, `${room.name} checkRoomAt counted: ${boostTiming.checkRoomAt - Game.time}`);
						} else {
							global.logSystem(room.name, `reactions done in ${room.name}`);

							let labs = room.find(FIND_MY_STRUCTURES, {
								filter: (s) => {
									return s.structureType === STRUCTURE_LAB;
								},
							});
							for (let i = 0; i < labs.length; i++) {
								let lab = labs[i];
								let data = room.memory.resources.lab.find(s => s.id === lab.id);
								if (data && (data.reactionState === global.LAB_IDLE || data.reactionState === global.LAB_SEED)) {
									room.cancelReactionOrder(lab.id);
								}
							}
							data.reactions.reactorMode = global.REACTOR_MODE_IDLE;
							data.boostTiming = {};
						}
					} else if (_.isUndefined(data.reactions.orders))
						data.boostTiming = {};
				}

				// log and fix next finishing reactions data
				if ((Game.time % 50 === 0 && data.reactions && data.reactions.reactorMode === 'burst' && data.boostTiming.roomState === 'reactionMaking' && boostTiming.checkRoomAt - Game.time <= 300)
					|| (Game.time % 50 === 0 && checkOrdersPlacedRoom)) {

					checkOrdersPlacedRoom = false;

					let reactionOrder = data.reactions.orders[0];

					if (reactionOrder && reactionOrder.amount > 0) {

						global.logSystem(room.name, `${room.name}, finishing ${reactionOrder.type}. checkRoomAt: ${boostTiming.checkRoomAt - Game.time}`);

						let labA = Game.getObjectById(data.reactions.seed_a),
							labB = Game.getObjectById(data.reactions.seed_b),
							orderType = reactionOrder.type,
							component_a = global.LAB_REACTIONS[orderType][0],
							component_b = global.LAB_REACTIONS[orderType][1],
							reactionAmount = reactionOrder.amount,
							labOrderAmounts = room.getSeedLabOrders(),
							labOrderAmountA = labOrderAmounts.labOrderAmountA,
							labOrderAmountB = labOrderAmounts.labOrderAmountB,
							resourcesA = (room.resourcesAll[component_a] || 0) + (room.resourcesReactions[component_a] || 0),
							resourcesB = (room.resourcesAll[component_b] || 0) + (room.resourcesReactions[component_b] || 0),
							labResourcesA = labA.mineralAmount + labOrderAmountA,
							labResourcesB = labB.mineralAmount + labOrderAmountB;


						let fixReactionOrders = function (orderA, orderB) {
							let minAmount = Math.min(orderA, orderB);
							if (minAmount >= LAB_REACTION_AMOUNT) {
								reactionOrder.amount = minAmount;
								boostTiming.reactionMaking = Game.time;
								room.countCheckRoomAt();
							} else {
								reactionOrder.amount = 0;
								boostTiming.checkRoomAt = Game.time;
							}
							global.logSystem(room.name, `reactionOrders fixed: ${reactionOrder.amount}`);
						};

						global.logSystem(room.name, `reactionAmount ${reactionAmount}`);
						global.logSystem(room.name, `labs stored: seed_a: ${labA.mineralAmount} ${component_a} seed_b: ${labB.mineralAmount} ${component_b}`);

						global.logSystem(room.name, `labs ordered: seed_a: ${labOrderAmountA} ${component_a} seed_b: ${labOrderAmountB} ${component_b}`);

						if (labResourcesA === reactionAmount && labResourcesB === reactionAmount) {

							global.logSystem(room.name, `lab orders OK`);

						} else if (reactionAmount > labResourcesA || reactionAmount > labResourcesB) {

							global.logSystem(room.name, `NOT ENOUGH lab orders:`);
							global.logSystem(room.name, `${room.name} reactionAmount: ${reactionAmount} DIFF: labA: ${labResourcesA - reactionAmount} labB: ${labResourcesB - reactionAmount}`);

							fixReactionOrders(labResourcesA, labResourcesB);

						} else if (reactionAmount < labResourcesA || reactionAmount < labResourcesB) {
							global.logSystem(room.name, `TOO MUCH lab orders:`);
							global.logSystem(room.name, `${room.name} reactionAmount: ${reactionAmount} DIFF: labA: ${labResourcesA - reactionAmount} labB: ${labResourcesB - reactionAmount}`);

							fixReactionOrders(labResourcesA, labResourcesB);
						}

						if (labOrderAmountA > resourcesA || labOrderAmountB > resourcesB) {

							let minResources = Math.min(resourcesA, resourcesB);

							fixReactionOrders(labA.mineralAmount + minResources, labB.mineralAmount + minResources);

							global.logSystem(room.name, `resources NOT OK`);
							global.logSystem(room.name, `resourcesA: ${resourcesA} resourcesB: ${resourcesB}`);
							global.logSystem(room.name, `reactionOrders fixed: ${reactionOrder.amount}`);

						} else
							global.logSystem(room.name, `resources OK`);
					}
				}

				// inactive rooms => try to make reactions
				// new line
				global.logSystem(room.name, `numberOfOrderingRooms: ${numberOfOrderingRooms} roomFound: ${roomFound} allLabs: ${room.structures.labs.all.length} storageLabs: ${room.structures.labs.storage.length}`);
				if (numberOfOrderingRooms === 0 && !ordersPlacedRoom && !roomFound && room.structures.labs.all.length !== room.structures.labs.storage.length - 2) {
					roomFound = room.makeReaction();
					//global.logSystem(room.name, `roomFound ${roomFound}`);
				}
			}
		}
	},
};

module.exports = mod;


