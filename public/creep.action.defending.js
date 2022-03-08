let action = new Creep.Action('defending');
module.exports = action;
action.name = 'defending';
action.isValidAction = function (creep) {
	if (creep.data.creepType !== 'sourceKiller' && Game.flags[creep.data.destiny.flagName] && Game.flags[creep.data.destiny.flagName].room && Game.flags[creep.data.destiny.flagName].room.name !== creep.room.name)
		return false;
	let hostilesExist = creep.room ? creep.room.hostiles.length > 0 : creep.room.memory.hostileIds.length > 0;
	let flagExist = !!global.FlagDir.find(global.FLAG_COLOR.claim.mining, creep.pos, true);
	let myRoom = !!creep.room.my;
	let inPosition = flagExist || myRoom;
	let ret = hostilesExist && inPosition;

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} ${creep.data.actionName} WARRIOR: defending, IS VALID ACTION: hostileExist: ${hostilesExist} flagExist: ${inPosition} myRoom: ${myRoom} ret: ${ret}`);

	return ret;
};
action.isAddableAction = function () {
	return true;
};
action.isAddableTarget = function () {
	return true;
};
action.isValidTarget = function (target) {
	return (
		target &&
		target.hits != null &&
		target.hits > 0 &&
		target.my === false);
};
action.newTarget = function (creep) {

	let closestHostile = creep.pos.findClosestByRange(creep.room.hostiles, {
		filter: action.defaultStrategy.priorityTargetFilter(creep),
	});
	if (!closestHostile) {
		closestHostile = creep.pos.findClosestByRange(creep.room.hostiles, {
			filter: action.defaultStrategy.targetFilter(creep),
		});
		if (!closestHostile) {
			closestHostile = creep.pos.findClosestByRange(creep.room.hostiles);
		}
	}

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} data.actionName: ${creep.data.actionName} action: ${creep.action} WARRIOR: defending, target: ${closestHostile}`);

	return closestHostile;
};
action.step = function (creep) {
	if (global.CHATTY)
		creep.say(this.name, global.SAY_PUBLIC);
	if (creep.target.pos.roomName !== creep.room.name)
		return Creep.action.travelling.assignRoom(creep, creep.target.pos.roomName);
	this.run[creep.data.creepType](creep);
};
action.makeRangedAttack = function (creep, range) {

	let targets = creep.pos.findInRange(creep.room.hostiles, 3);

	if (targets.length > 2) { // TODO: precalc damage dealt
		if (global.CHATTY)
			creep.say('MassAttack');
		creep.attackingRanged = creep.rangedMassAttack() === OK;
	} else if (range < 4) {
		creep.attackingRanged = creep.rangedAttack(creep.target) === OK;
	} else if (targets.length > 0) {
		creep.attackingRanged = creep.rangedAttack(targets[0]) === OK;
	}
};
action.makeMeleeAttack = function (creep) {
	let attacking = creep.attack(creep.target);
	if (attacking === ERR_NOT_IN_RANGE) {
		let targets = creep.pos.findInRange(creep.room.hostiles, 1);
		if (targets.length > 0)
			creep.attacking = creep.attack(targets[0]) === OK;
	} else
		creep.attacking = attacking === OK;
};
action.run = {
	ranger: function (creep) {
		let range = creep.pos.getRangeTo(creep.target);
		if (!creep.flee) {
			if (range > 3) {
				creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
			}
			if (range < 3) creep.fleeMove();
		}
		// attack ranged
		action.makeRangedAttack(creep, range);
	},
	sourceKiller: function (creep) {
		let range = creep.pos.getRangeTo(creep.target);
		if (!creep.flee && ((creep.hits === creep.hitsMax || range <= 3) || range > 4)) {
			creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
		}
		// attack
		action.makeMeleeAttack(creep);
	},
	melee: function (creep) {
		let range = creep.pos.getRangeTo(creep.target);
		if (!creep.flee && range > 1) {
			creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
		}
		// attack
		action.makeMeleeAttack(creep);
	},
	warrior: function (creep) {

		//if (creep.target.owner.username === 'Invader')
		//    global.logSystem(creep.room.name, `Hello Warrior ${creep.name}`);

		let hasAttack = creep.hasActiveBodyparts(ATTACK);
		let hasRangedAttack = creep.hasActiveBodyparts(RANGED_ATTACK);
		let range = creep.pos.getRangeTo(creep.target);

		if (!creep.flee) {
			if (hasAttack) {
				if (range > 1) {
					creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
				}
			} else if (hasRangedAttack) {
				if (range > 3) {
					creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
				}
				if (range < 3)
					creep.fleeMove();
			} else
				creep.flee = true;
		}
		// attack ranged
		if (hasRangedAttack) {
			action.makeRangedAttack(creep, range);
		}
		// attack
		if (hasAttack) {
			action.makeMeleeAttack(creep);
		}
	},
};
action.defaultStrategy.priorityTargetFilter = function (creep) {
	return function (hostile) {
		return hostile.hasBodyparts(HEAL);
	};
};
action.defaultStrategy.targetFilter = function (creep) {
	return function (hostile) {
		if (hostile.owner.username === 'Source Keeper') {
			return creep.pos.getRangeTo(hostile) <= 5;
		}
		return true;
	};
};
