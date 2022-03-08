const mod = new Creep.Behaviour('warrior');
module.exports = mod;
const super_invalidAction = mod.invalidAction;
mod.name = 'warrior'
mod.invalidAction = function (creep) {

	// let isInvasionRoom = (creep) => {
	// 	let adjacentRooms = creep.room.adjacentAccessibleRooms;
	//
	// 	for (const roomName of adjacentRooms) {
	// 		let room = Game.rooms[roomName];
	// 		if (!!room && room.situation.remoteInvasion)
	// 			return true
	// 	}
	// 	return false;
	// }
	//
	// let remoteRoom = creep.action.name === 'guarding'
	// 	&& (!creep.flag || (creep.flag.pos.roomName !== creep.pos.roomName && !creep.leaveBorder()));
	// let isAdjacentRoomInvasionRoom = creep.action.name === 'guarding' && !isInvasionRoom(creep);
	// return super_invalidAction.call(this, creep) || remoteRoom || isAdjacentRoomInvasionRoom;

	// return super_invalidAction.call(this, creep)


	// TODO Check situation.remoteInvasion in adjacentAccessibleRooms
	// return super_invalidAction.call(this, creep) || (creep.action.name === 'guarding'
	// 		&& (!creep.flag || (creep.flag.pos.roomName !== creep.pos.roomName && !creep.leaveBorder()))
	// 	);



	let leaveBorder = creep.leaveBorder();
	let ret = super_invalidAction.call(this, creep)
		|| (creep.action.name === 'guarding')
		&& (!creep.flag || creep.flag.pos.roomName === creep.pos.roomName || leaveBorder
		// && (!creep.flag || creep.data.destiny.flagName === creep.data.flagName || leaveBorder
		// && (!creep.flag || leaveBorder
	);

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name)) {
		global.logSystem(creep.room.name, `${creep.name} WARRIOR: => flag ${creep.flag} atTargetRoom: ${!creep.flag || creep.flag.pos.roomName === creep.pos.roomName} leaveBorder: ${leaveBorder}`);
		global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: INVALID ACTION: ${ret}`);
	}

	// if (!creep.flag && creep.data.destiny)
	// 	creep.flag = Game.flags[creep.data.destiny.flagName];
	//
	// if (ret && creep.flag && creep.flag.pos.roomName !== creep.pos.roomName) {
	// 	this.gotoTargetRoom(creep, creep.flag)
	// }

	return ret;

};
const super_run = mod.run;
mod.run = function (creep) {
	creep.flee = creep.flee || !creep.hasActiveBodyparts([ATTACK, RANGED_ATTACK]);
	creep.attacking = false;
	creep.attackingRanged = false;
	super_run.call(this, creep);
	Creep.behaviour.ranger.heal.call(this, creep);
};
mod.actions = function (creep) {
	let temp = [
		// Creep.action.travelling,
		Creep.action.invading,
		Creep.action.invadersCore,
		Creep.action.defending,
		Creep.action.sourceKiller,
		Creep.action.guarding,
		Creep.action.healing,
		Creep.action.idle,
	];
	if (creep.data.destiny.boosted)
		temp.unshift(Creep.action.boosting);
	return temp;
};
mod.selectStrategies = function (actionName) {
	return [mod.strategies.defaultStrategy, mod.strategies[actionName]];
};
mod.strategies = {
	defaultStrategy: {
		name: `default-${mod.name}`,
		moveOptions: function (options) {
			// console.log(`DEFAULT:`);
			// allow routing in and through hostile rooms
			if (_.isUndefined(options.allowHostile) || !options.allowHostile)
				options.allowHostile = true;
			return options;
		},
	},
	boosting: {
		name: `boosting-${mod.name}`,
		isValidMineralType: function (mineralType) {
			// console.log('BOOSTING');
			for (let category in BOOSTS) {

				if (category !== 'attack' || category !== 'ranged_attack' || category !== 'heal' || category !== 'move' || category !== 'tough')
					continue;

				for (let compound in BOOSTS[category]) {
					if (mineralType === compound) {
						console.log(compound);
						return true;
					}
				}
			}
			return false;
		},
	},
	defending: {
		name: `defending-${mod.name}`,
		moveOptions: function (options) {
			// console.log('DEFENDING');
			options.respectRamparts = true;
			return options;
		},
		targetFilter: function (creep) {
			return function (hostile) {
				if (hostile.owner.username === 'Source Keeper') {
					return creep.pos.getRangeTo(hostile) <= 5;
				}
				return true;
			};
		},
		priorityTargetFilter: function (creep) {
			return function (hostile) {
				if (hostile.owner.username === 'Source Keeper') {
					return creep.pos.getRangeTo(hostile) <= 5;
				} else {
					return hostile.hasBodyparts(ATTACK) || hostile.hasBodyparts(RANGED_ATTACK) || hostile.hasBodyparts(WORK);
				}
			};
		},
	},
	healing: {
		name: `healing-${mod.name}`,
		moveOptions: function (options) {
			// console.log('HEALING');
			options.respectRamparts = true;
			return options;
		},
	}
};


