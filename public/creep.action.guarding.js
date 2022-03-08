let action = new Creep.Action('guarding');
module.exports = action;
action.name = 'guarding';
action.isValidAction = function (creep) {
	// return global.FlagDir.hasDefenseFlag(creep.pos) && creep.data.destiny.flagName === creep.data.flagName;
	return global.FlagDir.hasDefenseFlag(creep.pos);
};
action.isAddableAction = function () {
	return true;
};
action.isAddableTarget = function () {
	return true;
};
action.reachedRange = 0;
action.newTarget = function (creep) {

	let flag = creep.flag;

	if (!flag && creep.data.destiny)
		flag = Game.flags[creep.data.destiny.flagName];

	if (!flag) {
		// flag = global.FlagDir.find(global.FLAG_COLOR.defense, creep.pos, false, global.FlagDir.rangeMod, {
		// 	rangeModPerCrowd: 5,
		// 	//rangeModByType: creep.data.creepType
		// });
		flag = global.FlagDir.find(global.FLAG_COLOR.defense, creep.pos, true);

		if (!flag)
			flag = global.FlagDir.find(global.FLAG_COLOR.defense, creep.pos, false);
	}

	if (flag) {
		// if (global.DEBUG && global.TRACE)
		// 	global.trace('Action', {creepName: creep.name, flag: flag.name, newTarget: 'assigned flag', [creep.action.name]: 'newTarget', Action: creep.action.name});
		if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name)) {
			global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: registerCreepFlag => creep: ${creep}, flag: ${flag}`);
		}
		global.Population.registerCreepFlag(creep, flag);

	}

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name)) {
		global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: guarding select target, flag: ${creep.flag}`);
	}

	if (creep.room.isSKRoom && creep.pos.roomName === creep.flag.pos.roomName) {

	// if (creep.pos.roomName === flag.pos.roomName) {

		if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: guard at position`);

		let SKCreeps = _.filter(creep.room.hostiles, hostile => {
			return hostile.owner.username === 'Source Keeper' && (!hostile.targetOf || hostile.targetOf.length === 0);
		});

		if (SKCreeps.length === 0) {

			if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
				global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: no SKCreeps presented`);

			let otherHostiles = creep.room.hostiles;
			if (otherHostiles.length === 0) {
				let ret = _.min(creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR}), 'ticksToSpawn');

				if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
					global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: target Keeper Lair: ${ret}`);

				return ret;

			} else if (otherHostiles.length === 1)
				return otherHostiles[0];

			else {
				let closestHostile = creep.pos.findClosestByPath(otherHostiles, {
					filter: creep.getStrategyHandler([action.name], 'priorityTargetFilter', creep),
				});

				if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
					global.logSystem(creep.room.name, `closestHostile: ${closestHostile}`);

				return closestHostile;
			}
		} else if (SKCreeps.length > 0) {
			//global.logSystem(creep.room.name, `GUARD ATTACKING A HOSTILE creep!`);
			return creep.pos.findClosestByPath(SKCreeps);
		}
	} else if (creep.pos.roomName === creep.flag.pos.roomName){
		let otherHostiles = creep.room.hostiles;
		if (otherHostiles.length === 1) {
			return otherHostiles[0];
		} else {
			let closestHostile = creep.pos.findClosestByPath(otherHostiles, {
				filter: creep.getStrategyHandler([action.name], 'priorityTargetFilter', creep),
			});

			if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
				global.logSystem(creep.room.name, `closestHostile: ${closestHostile}`);
			if (!_.isNull(closestHostile))
				return closestHostile;

			if (creep.pos.getRangeTo(creep.flag) > 0) {
				if (!creep.target)
					creep.target = creep.flag;
				Creep.action.invading.run[creep.data.creepType](creep);
			}

		}
	}

	if (flag && !creep.action || creep.action.name !== 'guarding' && creep.pos.roomName === creep.flag.pos.roomName) {
		// global.Population.registerCreepFlag(creep, flag);
		global.Population.registerAction(creep, Creep.action.guarding, flag);
	}


	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: action: ${creep.action.name} flag: ${creep.flag}`);


	if (creep.action && creep.action.name === 'guarding' && creep.flag) {
		return creep.flag;
	}

	return flag;
};
action.work = function (creep) {

	if (creep.data.flagName)
		return OK;
	else
		return ERR_INVALID_ARGS;
};
action.defaultStrategy.priorityTargetFilter = function (creep) {
	return function (hostile) {
		return hostile.hasBodyparts(HEAL);
	};
};
