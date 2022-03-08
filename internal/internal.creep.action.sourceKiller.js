let action = new Creep.Action('sourceKiller');
module.exports = action;
action.isValidAction = function (creep) {
	// return creep.room.hostiles.length === 0 && creep.data.flagName === creep.data.destiny.flagName;
	// return creep.room.hostiles.length === 0 && !creep.room.invadersCore;
	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name)) {
		global.logSystem(creep.room.name, `${creep.name} SOURCEKILLER: hostiles: ${creep.room.hostiles.length === 0} atTargetRoom: ${global.FlagDir.hasSKFlag(creep.pos)} ${creep.data.destiny.targetName}`);
	}
	// return creep.room.hostiles.length === 0 && global.FlagDir.hasSKFlag(creep.pos) === creep.data.destiny.targetName;
	return creep.room.hostiles.length === 0
};
action.isValidTarget = function (target, creep) {
	let ret;

	if (target) {
		if (target.room) {
			ret = target.room.name === creep.room.name && target.ticksToSpawn;
		}
	}
	return ret;
	// return global.FlagDir.hasSKFlag(creep.pos) && creep.data.destiny.flagName === creep.data.flagName;
};
action.isAddableAction = function () {
	return true;
};
action.isAddableTarget = function () {
	return true;
};
action.newTarget = function (creep) {
	let flag = creep.flag;

	if (!flag && creep.data.destiny)
		flag = Game.flags[creep.data.destiny.flagName];

	if (!flag) {
		// TODO rangeModPerCrowd only works for traveling creeps's
		flag = global.FlagDir.find(global.FLAG_COLOR.defense.sourceKiller, creep.pos, false, global.FlagDir.rangeMod, {
			rangeModPerCrowd: 10,
		});

		if (flag) {
			if (global.DEBUG && global.TRACE)
                global.trace('Action', {creepName: creep.name, flag: flag.name, newTarget: 'assigned flag', [action.name]: 'newTarget', Action: action.name});
            global.Population.registerCreepFlag(creep, flag);
		}
	}

	if (creep.pos.roomName === _.get(flag, ['pos', 'roomName'], creep.pos.roomName)) {
		const lowLair = _(creep.room.structures.all).filter({structureType: STRUCTURE_KEEPER_LAIR}).sortBy('ticksToSpawn').first();
		if (global.DEBUG && global.TRACE)
			global.Util.trace('Action', {creepName: creep.name, lair: lowLair && lowLair.pos, newTarget: 'searched for low lair', [action.name]: 'newTarget', Action: action.name});
		return lowLair;
	}

	return flag || null;
};
action.work = function (creep) {
	if (creep.data.flagName)
		return OK;
	else return ERR_INVALID_ARGS;
};
action.onAssignment = function (creep, target) {
	if (global.SAY_ASSIGNMENT)
		creep.say(String.fromCharCode(9929), global.SAY_PUBLIC);
};
