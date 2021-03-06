let action = new Creep.Action('invading');
module.exports = action;
action.isValidAction = function (creep) {
	return global.FlagDir.hasInvasionFlag();
};
action.isAddableAction = function () {
	return true;
};
action.isAddableTarget = function () {
	return true;
};
action.getFlaggedStructure = function (flagColor, pos) {
	let flagsEntries = global.FlagDir.filter(flagColor, pos, true);
	let target = [];
	let checkFlag = flagEntry => {
		let flag = Game.flags[flagEntry.name];
		if (flag && flag.pos.roomName === pos.roomName && flag.room !== undefined) { // room is visible
			let targets = flag.room.lookForAt(LOOK_STRUCTURES, flag.pos.x, flag.pos.y);
			if (targets && targets.length > 0) {
				let addTarget = structure => {
					structure.destroyFlag = flag;
					target.push(structure);
				};
				targets.forEach(addTarget);
			} else { // remove flag. try next flag
				flag.remove();
			}
		}
	};
	flagsEntries.forEach(checkFlag);
	if (target && target.length > 0)
		return pos.findClosestByRange(target);
	return null;
};
action.newTarget = function (creep) {
	let destroy = this.getFlaggedStructure(global.FLAG_COLOR.destroy, creep.pos);
	if (destroy) {
		if (destroy.destroyFlag)
			global.Population.registerCreepFlag(creep, destroy.destroyFlag);
		return destroy;
	}
	// move to invasion room
	let flag = global.FlagDir.find(global.FLAG_COLOR.invade, creep.pos, false);
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

	if (!flag.room.controller || !flag.room.controller.my) {

		//attack healer
		let target = creep.pos.findClosestByRange(creep.room.hostiles, {
			function(hostile) {
				return _.some(hostile.body, {'type': HEAL});
			},
		});
		if (target)
			return target;

		//attack attacker
		target = creep.pos.findClosestByRange(creep.room.hostiles, {
			function(hostile) {
				return _.some(hostile.body, function (part) {
					return part.type === ATTACK || part.type === RANGED_ATTACK;
				});
			},
		});
		if (target)
			return target;

		// attack tower
		target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
			filter: (structure) => {
				return structure.structureType === STRUCTURE_TOWER;
			},
		});
		if (target)
			return target;

		// attack remaining creeps
		target = creep.pos.findClosestByRange(creep.room.hostiles);
		if (target)
			return target;

		// attack invadersCore
		target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
			filter: (structure) => {
				return structure.structureType === STRUCTURE_INVADER_CORE;
			},
		});

		// attack spawn
		target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
			filter: (structure) => {
				return structure.structureType === STRUCTURE_SPAWN;
			},
		});
		if (target)
			return target;

		// attack structures
		target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
			filter: (structure) => {
				return structure.structureType !== STRUCTURE_CONTROLLER;
			},
		});
		if (target)
			return target;

		// attack construction sites
		target = creep.pos.findClosestByPath(FIND_HOSTILE_CONSTRUCTION_SITES);
		if (target)
			return target;
	}
	// no target found
	flag.remove();
	return null;
};
action.step = function (creep) {
	if (global.CHATTY) creep.say(this.name);
	if ((creep.target instanceof Flag) && (creep.target.pos.roomName === creep.pos.roomName))
		this.assign(creep);
	this.run[creep.data.creepType](creep);
};
action.run = {
	melee: function (creep) {
		if (!creep.flee) {
			if (creep.target instanceof Flag) {
				creep.travelTo(creep.target);
				return;
			} else if (creep.target instanceof ConstructionSite) {
				creep.travelTo(creep.target, {range: 0});
				return;
			}
			creep.travelTo(creep.target);
		}
		if (!creep.target.my)
			creep.attacking = creep.attack(creep.target) === OK;
	},
	ranger: function (creep) {
		let range = creep.pos.getRangeTo(creep.target);
		if (!creep.flee) {
			if (creep.target instanceof Flag) {
				creep.travelTo(creep.target);
				return;
			} else if (creep.target instanceof ConstructionSite) {
				creep.travelTo(creep.target, {range: 0});
				return;
			}
			if (range > 3) {
				creep.travelTo(creep.target);
			}
			if (range < 3) {
				creep.move(creep.target.pos.getDirectionTo(creep));
			}
		}
		// attack
		let targets = creep.pos.findInRange(creep.room.hostiles, 3);
		if (targets.length > 2) { // TODO: calc damage dealt
			if (global.CHATTY)
				creep.say('MassAttack');
			creep.attackingRanged = creep.rangedMassAttack() === OK;
			return;
		}
		if (range < 4) {
			creep.attackingRanged = creep.rangedAttack(creep.target) === OK;
			return;
		}
		if (targets.length > 0) {
			creep.attackingRanged = creep.rangedAttack(targets[0]) === OK;
		}
	},
	warrior: function (creep) {
		let range = creep.pos.getRangeTo(creep.target);
		let hasAttack = creep.hasActiveBodyparts(ATTACK);
		let hasRangedAttack = creep.hasActiveBodyparts(RANGED_ATTACK);
		if (!creep.flee) {
			if (hasAttack) {
				if (creep.target instanceof Flag) {
					creep.travelTo(creep.target);
					return;
				} else if (creep.target instanceof ConstructionSite) {
					creep.travelTo(creep.target, {range: 0});
					return;
				}
				creep.travelTo(creep.target);
			} else if (hasRangedAttack) {
				if (creep.target instanceof Flag) {
					creep.travelTo(creep.target);
					return;
				} else if (creep.target instanceof ConstructionSite) {
					creep.travelTo(creep.target, {range: 0});
					return;
				}
				if (range > 3) {
					creep.travelTo(creep.target);
				}
				if (range < 3) {
					//creep.move(creep.target.pos.getDirectionTo(creep));
					creep.fleeMove();
				}
			} else creep.flee = true;
		}
		// attack
		if (hasAttack) {
			let attacking = creep.attack(creep.target);
			if (attacking === ERR_NOT_IN_RANGE) {
				let targets = creep.pos.findInRange(creep.room.hostiles, 1);
				if (targets.length > 0)
					creep.attacking = creep.attack(targets[0]) === OK;
			} else
				creep.attacking = attacking === OK;
		}
		// attack ranged
		if (hasRangedAttack) {
			let targets = creep.pos.findInRange(creep.room.hostiles, 3);
			if (targets.length > 2) { // TODO: precalc damage dealt
				if (global.CHATTY) creep.say('MassAttack');
				creep.attackingRanged = creep.rangedMassAttack() === OK;
				return;
			}
			let range = creep.pos.getRangeTo(creep.target);
			if (range < 4) {
				creep.attackingRanged = creep.rangedAttack(creep.target) === OK;
				return;
			}
			if (targets.length > 0) {
				creep.attackingRanged = creep.rangedAttack(targets[0]) === OK;
			}
		}
	},
	trainLeader: function (creep) {
		Creep.action.invading.run['warrior'](creep);
	},
};
action.defaultStrategy.moveOptions = function (options) {
	// allow routing in and through hostile rooms
	if (_.isUndefined(options.allowHostile)) options.allowHostile = true;
	return options;
};
