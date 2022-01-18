'use strict';

const TRADING = 'basicTrading';

let mod = {
	run() {

		if (Game.shard.name !== 'shard1')
			return;

		if (!global.SEGMENT_COMMS.enabled)
			return;

		if (_.isUndefined(Memory.segmentTransactions)) {
			Memory.segmentTransactions = {};
			// Memory.segmentTransactions.otherPlayerSegmentCount = 0;
		}
		if (Game.time % global.SEGMENT_COMMS.sendAndRequestTiming === 0) {
			console.log(`SEGMENT COMMUNICATIONS STARTING`);
			this.analyzeOtherPlayerSegment();
			this.writeMyRequest();
		} else if (Game.time % global.SEGMENT_COMMS.trackTiming === 0) {
			console.log(`SEGMENT COMMUNICATIONS TRACKING`);
			this.trackSegmentSharing();
		}
	},
	minEnergy() {
		return global.acceptedRooms.length * (global.MAX_STORAGE_ENERGY[8] + global.TERMINAL_ENERGY + global.ENERGY_BALANCE_TRANSFER_AMOUNT);
	},
	getObjectPlayerSegment(playerName, seg) {
		let raw = RawMemory.foreignSegment;
		if (raw === undefined) {
			RawMemory.setActiveForeignSegment(playerName, seg);
			return undefined;
		}
		if (raw.username === playerName) {
			if (raw.data !== undefined) {
				//parseSegment(raw.data);
				if (raw.data[0] === '{' && raw.data[raw.data.length - 1] === '}') {
					// console.log(`player: ${playerName} ${global.json(JSON.parse(raw.data))}`);
					return JSON.parse(raw.data);
				} else {
					console.log(playerName, 'segment is not an object ERROR');
				}
			}
		}
	},
	roomRequestMineral(targetRoom, resource, amount) {

		let message = `from Zolcsika at ${Game.time}`;

		let offerRooms = _.filter(acceptedRooms, room => {
			// console.log(`${room.storage.store[resource] >= amount || room.terminal.store[resource] >= amount}`);
			return room.terminal.store[resource] >= amount;
		});

		console.log(`offerRooms.length: ${offerRooms.length} for ${amount} ${resource}`);

		if (offerRooms.length > 0) {
			offerRooms.sort((a, b) => {
				// return Game.map.getRoomLinearDistance(targetRoom, a.name, true) - Game.map.getRoomLinearDistance(targetRoom, b.name, true);
				return b.terminal.store[resource] - a.terminal.store[resource];
			});
		}

		let offerRoom = offerRooms[0];
		if (!_.isUndefined(offerRoom)) {

			global.logSystem(offerRoom.name, `has ${offerRoom.terminal.store[resource]} ${resource} in the terminal`);

			if (offerRoom.terminal.store[resource] && offerRoom.terminal.store[resource] >= amount && offerRoom.terminal.cooldown <= 0) {

				let ret = offerRoom.terminal.send(resource, amount, targetRoom, message);
				if (ret === OK)
					global.logSystem(offerRoom.name, `'SEND WAS SUCCESS: ${amount} ${resource} from: ${offerRoom.name} to: ${targetRoom} `);
				else
					console.log('SEND WAS NOT SUCCESS:', resource, '@', offerRoom.name, targetRoom, '#:', amount, 'ERR', global.translateErrorCode(ret));

			} else if (offerRoom.terminal.cooldown > 0)
				global.logSystem(offerRoom.name, `terminal is busy, cooldown: ${offerRoom.terminal.cooldown}`);
		} else {
			console.log(`There is no offerRoom for ${resource}`);
		}

	},
	analyzeOtherPlayerSegment() {
		console.log(`analyzeOtherPlayerSegment`);
		// Reason this is an array instead of object, is that it's easy to use the keys in an array across multiple ticks.
		let alliedList = global.SEGMENT_COMMS.alliedList;
		// let notSeen = 0;
		// Acceptable array is the resources you are willing to trade out.
		let acceptable = global.SEGMENT_COMMS.acceptableMinerals;
		// The minimum you have of the above mineral before you trade.
		let acceptNum = global.SEGMENT_COMMS.minAmount;

		if (Memory.segmentTransactions.otherPlayerSegmentCount === undefined || Memory.segmentTransactions.otherPlayerSegmentCount >= alliedList.length) {
			Memory.segmentTransactions.otherPlayerSegmentCount = 0;
		}

		let obj = mod.getObjectPlayerSegment(alliedList[Memory.segmentTransactions.otherPlayerSegmentCount][0], alliedList[Memory.segmentTransactions.otherPlayerSegmentCount][1]);


		if (obj !== undefined) {
			// console.log(global.BB(obj[TRADING]));
			let basic = obj[TRADING];
			// console.log(alliedList[Memory.otherPlayerSegmentCount][0], '@', basic.room, alliedList[Memory.otherPlayerSegmentCount][1], 'Doing basicTrading:');
			for (let resource in basic) {
				if (resource === 'room') {
					continue;
				}
				// console.log(`wanted: ${basic[resource]} resource: ${resource} Memory: ${Memory.stats.empireMinerals[resource]}`);
				// console.log(`available: ${Memory.stats.empireMinerals[resource] > acceptNum}`);
				// console.log(`contains: ${_.contains(acceptable, resource)}`);
				if (resource !== RESOURCE_ENERGY) {
					if (basic[resource]) {
						if (Memory.stats.empireMinerals[resource] > acceptNum && _.contains(acceptable, resource)) {
							// Here we do the sending logic.
							let amount = global.MIN_OFFER_AMOUNT;
							mod.roomRequestMineral(basic.room, resource, amount);

							// profitReport('E58S57', alliedList[Memory.otherPlayerSegmentCount][0], zz, undefined, amount, resource, 0, basic.room);
						}
					}
				} else {
					if (basic[resource]) {
						if (Memory.stats.empireMinerals[resource] > mod.minEnergy() && _.contains(acceptable, resource)) {
							// Here we do the sending logic.
							let amount = global.MIN_OFFER_AMOUNT;
							mod.roomRequestMineral(basic.room, resource, amount);

							// profitReport('E58S57', alliedList[Memory.otherPlayerSegmentCount][0], zz, undefined, amount, resource, 0, basic.room);
						}
					}
				}
			}
		}
		Memory.segmentTransactions.otherPlayerSegmentCount++;
		if (Memory.segmentTransactions.otherPlayerSegmentCount >= alliedList.length) {
			Memory.segmentTransactions.otherPlayerSegmentCount = 0;
		}
		RawMemory.setActiveForeignSegment(alliedList[Memory.segmentTransactions.otherPlayerSegmentCount][0], alliedList[Memory.segmentTransactions.otherPlayerSegmentCount][1]);
	},
	makeRequestString() {
		console.log(`makeRequest`);
		let ret = {
			basicTrading: { // currently, used by all and basic empire balancing.
				room: '',
				energy: false,
				H: false,
				O: false,
				X: false,
				U: false,
				L: false,
				Z: false,
				K: false,
			},
			nuke: [
				{
					'x': 5,
					'y': 5,
					'roomName': 'E1S11',
					'time': 36748505,
					'test': true,
				},
			],
			// advancedTrading: { //prototype, not used
			// 	E3N15: {
			// 		K: 5000,
			// 		XGHO2: 100,
			// 	},
			// 	E1N15: {
			// 		L: 5000,
			// 	},
			// },
		};
		for (let mineral in ret.basicTrading) {
			if (mineral !== 'room') {
				if (Memory.stats.empireMinerals[mineral] < global.SEGMENT_COMMS.minAmount
					|| (mineral === 'energy') && Memory.stats.empireMinerals[mineral] < mod.minEnergy()) {
					console.log('Making request string', mineral);
					ret.basicTrading[mineral] = true;
					ret.basicTrading.room = _.min(acceptedRooms, 'storage.sum').name;
				}
			}
		}
		return JSON.stringify(ret);
	},
	trackSegmentSharing() {
		let playerName = global._ME;

		// if (Memory.stats.playerTrade === undefined) {
		// 	Memory.stats.playerTrade = {};
		// }

		if (Memory.segmentTransactions.lastIncoming === undefined) {
			Memory.segmentTransactions.lastIncoming = {};
			Memory.segmentTransactions.lastIncoming.time = 0;
		}
		if (Memory.segmentTransactions.lastOutgoing === undefined) {
			Memory.segmentTransactions.lastOutgoing = {};
			Memory.segmentTransactions.lastOutgoing.time = 0;
		}

		let lastIncoming = Memory.segmentTransactions.lastIncoming,
			lastOutgoing = Memory.segmentTransactions.lastOutgoing;


		let incomingTrans = Game.market.incomingTransactions;
		let latestTransactionTime;
		let transaction;

		lastIncoming.resources = {}

		for (let id in incomingTrans) {

			transaction = incomingTrans[id];

			if (transaction.time > lastIncoming.time) {
				if (!latestTransactionTime) {
					latestTransactionTime = transaction.time;
				}
				if (!transaction.sender || transaction.order) {
					continue;
				}

				let username = transaction.sender.username;

				if (username !== playerName && transaction.order === undefined) {

					if (_.isUndefined(lastIncoming.resources[transaction.sender.username]))
						lastIncoming.resources[transaction.sender.username] = {};

					lastIncoming.resources[transaction.sender.username][transaction.resourceType] = transaction.amount;

					if (Memory.segmentTransactions[username] === undefined) {
						Memory.segmentTransactions[username] = {};
					}
					if (Memory.segmentTransactions[username][transaction.resourceType] === undefined) {
						Memory.segmentTransactions[username][transaction.resourceType] = 0;
					}
					Memory.segmentTransactions[username][transaction.resourceType] += transaction.amount;
				}
			} else {
				break;
			}
		}

		if (latestTransactionTime)
			lastIncoming.time = latestTransactionTime;

		let outgoingTrans = Game.market.outgoingTransactions;

		lastOutgoing.resources = {}

		for (let id in outgoingTrans) {

			transaction = outgoingTrans[id];

			if (transaction.time > lastOutgoing.time) {

				if (!latestTransactionTime)
					latestTransactionTime = transaction.time;

				if (!transaction.recipient || transaction.order)
					continue;

				let username = transaction.recipient.username;

				if (username && username !== playerName) {

					if (_.isUndefined(lastOutgoing.resources[transaction.recipient.username]))
						lastOutgoing.resources[transaction.recipient.username] = {};

					lastOutgoing.resources[transaction.recipient.username][transaction.resourceType] = transaction.amount;

					if (Memory.segmentTransactions[username] === undefined) {
						Memory.segmentTransactions[username] = {};
					}
					if (Memory.segmentTransactions[username][transaction.resourceType] === undefined) {
						Memory.segmentTransactions[username][transaction.resourceType] = 0;
					}
					Memory.segmentTransactions[username][transaction.resourceType] -= transaction.amount;
				}
			} else {
				break;
			}
		}
		if (latestTransactionTime) {
			lastOutgoing.time = latestTransactionTime;
		}
	},
	writeMyRequest() {
		console.log(`setMyPublicSegment is running`);
		RawMemory.segments[99] = this.makeRequestString();
	},
};

module.exports = mod;
