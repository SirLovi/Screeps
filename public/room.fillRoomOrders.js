'use strict';

let mod = {
	analyze() {
		this.fillRoomOrders();
	},
	fillRoomOrders() {

		if (!global.MAKE_COMPOUNDS && !global.ALLOCATE_COMPOUNDS)
			return;

		if (_.isUndefined(Memory.boostTiming))
			Memory.boostTiming = {};

		if (_.isUndefined(Memory.boostTiming.roomTrading)) {
			Memory.boostTiming.roomTrading = {
				boostProduction: false,
				boostAllocation: false,
			};
		}

		if (_.isUndefined(Memory.boostTiming.timeStamp))
			Memory.boostTiming.timeStamp = Game.time;

		if(_.isUndefined(Memory.boostTiming.checkRooms)) {
			Memory.boostTiming.checkRooms = {
				nextCheck: Game.time,
				rooms: myRoomsName
			}
		} else if (Memory.boostTiming.checkRooms.rooms.length === 0)
			Memory.boostTiming.checkRooms.rooms = myRoomsName;

		let orderingRoom = global.orderingRoom(),
			numberOfOrderingRooms = orderingRoom.length,
			roomTrading = Memory.boostTiming.roomTrading,
			roomTradingType,
			// TODO it can be orderingRoom[0].memory.resources.boostTiming.roomState = 'reactionPlaced'
			ordersPlacedRoom = _.some(myRooms, room => {
				let data = room.memory.resources;
				if (!data || !data.boostTiming)
					return false;
				return data.boostTiming.roomState === 'ordersPlaced';
			});

		if (ordersPlacedRoom && roomTrading.boostProduction === false && roomTrading.boostAllocation === false) {
			Memory.boostTiming.roomTrading.boostProduction = true;
			Memory.boostTiming.timeStamp = Game.time;
		}

		if (numberOfOrderingRooms >= 1) {

			let room = orderingRoom[0];

			if (roomTrading.boostProduction)
				roomTradingType = `BOOST_PRODUCTION since: ${Game.time - Memory.boostTiming.timeStamp}`;
			if (roomTrading.boostAllocation)
				roomTradingType = `BOOST_ALLOCATION since: ${Game.time - Memory.boostTiming.timeStamp}`;

			if (!Memory.boostTiming.multiOrderingRoomName && Game.time % 5 === 0) {
				let checkRoomAt = room.memory.resources.boostTiming.checkRoomAt || Game.time + 1;
				let currentRoomTradingType = _.isUndefined(roomTradingType) ?
					roomTradingType = `BOOST_ALLOCATION since: ${Game.time - Memory.boostTiming.timeStamp}` : roomTradingType;
				global.logSystem(room.name, `orderingRoom.name: ${room.name}, checkRoomAt: ${checkRoomAt - Game.time} ${currentRoomTradingType}`);
			} else if (Game.time % 5 === 0)
				global.logSystem(room.name, `multi ordering in progress at ${Memory.boostTiming.multiOrderingRoomName}`);

		} else if (numberOfOrderingRooms > 1) {
			console.log(`WARNING: ${numberOfOrderingRooms} ordering rooms!`);
			for (const room of orderingRoom) {
				global.logSystem(room.name, `${room.name}`);
			}
		}

		if (numberOfOrderingRooms >= 1
			&& Game.time >= orderingRoom[0].memory.resources.boostTiming.checkRoomAt
			&& !Memory.boostTiming.multiOrderingRoomName) {
			let room = orderingRoom[0],
				data = room.memory.resources,
				ordersWithOffers = room.ordersWithOffers();

			if (ordersWithOffers) {
				let returnValue = room.checkOffers();
				global.logSystem(room.name, `checkOffers called from ${room.name} returnValue: ${returnValue}`);
			} else {
				global.logSystem(room.name, `${room.name} no offers found, updating offers`);
				room.GCOffers();
				global.logSystem(room.name, `founded offers:`);
				global.logSystem(room.name, `orders: ${global.json(data.orders)}`);
				global.logSystem(room.name, `offers: ${global.json(data.offers)}`);

			}
		} else if (orderingRoom.length === 0) {

			let roomTrading = Memory.boostTiming.roomTrading;

			if (roomTrading.boostProduction === true && !ordersPlacedRoom) {
				roomTrading.boostProduction = false;
				Memory.boostTiming.timeStamp = Game.time;
			} else if (roomTrading.boostAllocation === true) {
				roomTrading.boostAllocation = false;
				Memory.boostTiming.timeStamp = Game.time;
			}

			if (Game.time % 5 === 0) {
				console.log(`boostProduction: ${roomTrading.boostProduction} boostAllocation: ${roomTrading.boostAllocation} - since: ${Game.time - Memory.boostTiming.timeStamp}`);
			}


		}

		if ((global.MAKE_COMPOUNDS || global.ALLOCATE_COMPOUNDS) && Memory.boostTiming && Memory.boostTiming.multiOrderingRoomName) {

			let memoryOrderingRoom = Game.rooms[Memory.boostTiming.multiOrderingRoomName],
				data = memoryOrderingRoom.memory.resources,
				candidates = data.boostTiming.ordersReady,
				orderCandidates = candidates.orderCandidates,
				returnValue = false;

			if (Game.time < candidates.time)
				return;

			if (orderCandidates.length === 0) {
				global.logSystem(memoryOrderingRoom.name, `all ready offers completed to ${Memory.boostTiming.multiOrderingRoomName} Memory.boostTiming.multiOrderingRoomName deleted.`);
				Game.rooms[Memory.boostTiming.multiOrderingRoomName].memory.resources.boostTiming.checkRoomAt = Game.time + global.CHECK_ORDERS_INTERVAL;
				delete Memory.boostTiming.multiOrderingRoomName;
				delete memoryOrderingRoom.memory.resources.boostTiming.ordersReady;
				return;
			}

			for (let i = 0; i < orderCandidates.length; i++) {

				let candidate = orderCandidates[i],
					currentRoom = Game.rooms[candidate.room];

				if (candidate.readyOffers > 0) {

					if (currentRoom.terminal.cooldown > 0) {
						global.logSystem(currentRoom.name, `${currentRoom.name} terminal.cooldown: ${currentRoom.terminal.cooldown} fillARoomOrder() delayed.`);
						candidates.time = Game.time + currentRoom.terminal.cooldown;
						continue;
					} else
						candidates.time = Game.time + 1;

					global.logSystem(memoryOrderingRoom.name, `running ${candidate.room} fillARoomOrder() in a row, time: ${Game.time} readyOffers: ${candidate.readyOffers}`);
					returnValue = currentRoom.fillARoomOrder();
					// new line
					if (returnValue === OK || returnValue === true) {
						candidate.readyOffers--;
						if (candidate.readyOffers >= 1) {
							global.logSystem(candidate.room, `has ${candidate.readyOffers} remains fillRoomOrders check. readyOffers: ${candidate.readyOffers}`);
						} else {
							global.logSystem(memoryOrderingRoom.name, `offers from ${candidate.room} are completed`);
							orderCandidates.splice(i, 1);
							i--;
						}
					} else if (returnValue === ERR_TIRED) {
						candidates.time = Game.time + currentRoom.terminal.cooldown;
						global.logSystem(candidate.room, `${candidate.room} offers from ${candidate.room} failed send to ${memoryOrderingRoom.name}.  Terminal.cooldown: ${currentRoom.terminal.cooldown}`);
					} else if (returnValue === ERR_NOT_ENOUGH_RESOURCES) {
						global.logSystem(memoryOrderingRoom.name, `WARNING: offers from ${candidate.room} are not completed: not enough resources`);
						orderCandidates.splice(i, 1);
						i--;
					} else {
						global.logSystem(memoryOrderingRoom.name, `WARNING: offers from ${candidate.room} are not completed. Offers deleted. terminal.send returns: ${returnValue}`);
						orderCandidates.splice(i, 1);
						i--;
					}
				}
			}
		}
	},
};

module.exports = mod;
