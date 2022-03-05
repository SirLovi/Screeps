let action = new Creep.Action('invadersCore');
module.exports = action;
action.name = 'invadersCore';
action.isValidAction = function (creep) {
	// return global.FlagDir.hasInvadersCoreFlag() && (creep.data.destiny.flagName === creep.data.targetId || creep.data.destiny.flagName === creep.data.flagName);
	return global.FlagDir.hasInvadersCoreFlag() && (creep.data.destiny.flagName === creep.data.flagName);
};
action.isAddableAction = function () {
	return true;
};
action.isAddableTarget = function () {
	return true;
};
action.newTarget = function (creep) {
	// move to invasion room
	let flag = global.FlagDir.find(global.FLAG_COLOR.defense.invadersCore, creep.pos, false);
	if (flag && (!flag.room || flag.pos.roomName !== creep.pos.roomName)) {
		global.Population.registerCreepFlag(creep, flag);
		return flag; // other room
	}
	if (!flag) {
		// unregister
		creep.action = null;
		delete creep.data.actionName;
		delete creep.data.targetId;
		return;
	}

	if (!flag.room.controller || !flag.room.controller.my || flag.room.reserved) {

		// attack invadersCore
		let ret = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
			filter: (structure) => {
				return structure.structureType === STRUCTURE_INVADER_CORE;
			},
		});

		if (ret)
			return ret;
	}
	// no target found
	flag.remove();
	return null;
};
action.step = function (creep) {
	if (global.CHATTY)
		creep.say(this.name);


	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} INVADERS CORE!!! - step: ${creep.data.creepType}`);

	if ((creep.target instanceof Flag) && (creep.target.pos.roomName === creep.pos.roomName))
		this.assign(creep);

	let ret;

	ret = action.run[creep.data.creepType](creep);

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name)) {
		global.logSystem(creep.room.name, `${creep.name} INVADING!!! - action ret ${ret}`);
	}

};
action.run = {
	warrior: function (creep) {
		let range = creep.pos.getRangeTo(creep.target);
		let hasAttack = creep.hasActiveBodyparts(ATTACK);
		if (hasAttack && range > 1) {
			creep.travelTo(creep.target);
			return;
		}
		// attack
		if (hasAttack) {
			let attacking = creep.attack(creep.target);
			if (attacking === ERR_NOT_IN_RANGE) {
				return false;
			} else
				creep.attacking = attacking === OK;
		}
	},
};
