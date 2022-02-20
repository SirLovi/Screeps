'use strict';

let mod = {
	analyze() {
		if (global.HANDLE_INVADERS_CORE.enabled && Game.time % global.HANDLE_INVADERS_CORE.timing === 0)
			this.run();
	},
	run() {
		let ret = this.collectRooms();
		this.handleCores(ret);


	},
	collectRooms() {
		return global.getInvadersCoreRooms();
	},
	handleStrongholdFlags(room, ticksRemaining, timeToLand) {
		// find and remove flags
		let flags = room.find(FIND_FLAGS);
		global.logSystem(room.name, `FLAGS: ${flags.length}`);

		if ((ticksRemaining < 100 || timeToLand < 100) && flags.length === 0) {
			let defenderFlagPos = new RoomPosition(48, 50, room.name),
				sourceKillerFlagPos = new RoomPosition(50, 50, room.name),
				miningFlagPos = new RoomPosition(52, 50, room.name);

			defenderFlagPos.newFlag(global.FLAG_COLOR.defense);
			sourceKillerFlagPos.newFlag(global.FLAG_COLOR.sourceKiller);
			miningFlagPos.newFlag(global.FLAG_COLOR.mining);

		} else if (flags.length > 0) {
			for (let flag of flags) {
				global.logSystem(room.name, `flag removed ${flag.name}`);
				flag.remove();
			}
		}
	},
	handleCores(ret) {

		let invadersCore = ret.invadersCore,
			stronghold = ret.stronghold;

		console.log(`STRONGHOLDS: ${stronghold.length}`);

		for (let core of stronghold) {

			let room = Game.rooms[core.pos.roomName];
			let ticksRemaining = core.effects[0].ticksRemaining;
			let ticksToDeploy = core.ticksToDeploy;
			let timeToLand = room.nuked ? room.nuked[0].timeToLand : Infinity;

			let displayInfo = (core, room, ticksRemaining, ticksToDeploy, timeToLand) => {
				if (room.nuked) {
					global.logSystem(room.name, `NUKED`);
					if (core.effects[0].effect === EFFECT_INVULNERABILITY || ticksToDeploy)
						global.logSystem(core.pos.roomName, `DEPLOYING CORE: level: ${core.level} (INVULNERABILITY) --> nuke will land in: ${timeToLand} ticksToDeploy: ${ticksToDeploy}`);
					else if (core.effects[0].effect === EFFECT_COLLAPSE_TIMER || ticksRemaining)
						global.logSystem(core.pos.roomName, `COLLAPSING CORE: level: ${core.level} --> nuke will land in: ${timeToLand} ticksRemaining: ${ticksRemaining}`);
				} else {
					global.logSystem(room.name, `NOT NUKED YET`);
					if (core.effects[0].effect === EFFECT_INVULNERABILITY || ticksToDeploy)
						global.logSystem(core.pos.roomName, `DEPLOYING CORE: level: ${core.level} (INVULNERABILITY) --> nuked: ${room.nuked} ticksToDeploy: ${ticksToDeploy}`);
					else if (core.effects[0].effect === EFFECT_COLLAPSE_TIMER || ticksRemaining)
						global.logSystem(core.pos.roomName, `COLLAPSING CORE: level: ${core.level} --> nuked: ${room.nuked} ticksRemaining: ${ticksRemaining}`);
				}

			};

			if (room.nuked) {
				// global.logSystem(core.pos.roomName, `nuked: ${room.nuked[0].timeToLand}`);

				if (global.HANDLE_INVADERS_CORE.display)
					displayInfo(core, room, ticksRemaining, ticksToDeploy, timeToLand);

				this.handleStrongholdFlags(room, ticksRemaining, timeToLand);

			} else {
				if (global.HANDLE_INVADERS_CORE.display)
					displayInfo(core, room, ticksRemaining, ticksToDeploy, timeToLand);

				if ((ticksRemaining && ticksRemaining > 51000) || ticksToDeploy && ticksToDeploy < 50000)
					room.launchAvailableNuke(core.pos);

				this.handleStrongholdFlags(room, ticksRemaining, timeToLand);

			}
		}

		console.log(`INVADERS_CORE: ${invadersCore.length}`);

		for (let core of invadersCore) {
			let room = Game.rooms[core.pos.roomName];
			let attackFlag = room.find(FIND_FLAGS, {
				filter: {color: COLOR_RED, secondaryColor: COLOR_RED},
			});
			let miningFlag = room.find(FIND_FLAGS, {
				filter: {color: COLOR_GREEN, secondaryColor: COLOR_BROWN},
			});
			let controllerAttackFlag = room.find(FIND_FLAGS, {
				filter: {color: COLOR_RED, secondaryColor: COLOR_CYAN},
			});


			if (miningFlag.length > 0) {

				if ((!room.controller.owner || room.controller.my) &&
					(room.controller.reservation && room.controller.reservation.username !== global.ME)) {
					if (controllerAttackFlag.length > 0) {
						global.logSystem(core.pos.roomName, `controller attack flag found!`);
					} else {
						global.logSystem(core.pos.roomName, `controller lost, flag placed`);
						room.controller.pos.newFlag(global.FLAG_COLOR.invade.attackController);
					}

				}
				if (attackFlag.length > 0) {
					global.logSystem(core.pos.roomName, `attack core flag found!`);
				} else {
					global.logSystem(core.pos.roomName, `flag placed`);
					core.pos.newFlag(global.FLAG_COLOR.invade);

				}
			}
		}
	},
};

module.exports = mod;
