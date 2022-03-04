let action = new Creep.Action('invading');
module.exports = action;
action.name = 'invading';
action.isValidAction = function (creep) {
	// return global.FlagDir.hasInvasionFlag() && !global.FlagDir.hasDefenseFlag();
	return global.FlagDir.hasInvasionFlag();
};
action.isAddableAction = function () {
	return true;
};
action.isAddableTarget = function (target, creep) {

	if (target && target.room && target.room.invadersCore) {
		// check if we have the target already
		if (target && creep.target && target.name === creep.target.name)
			return true;

		if (!target.memory) {
			target.memory = {};
		}

		// check if there are more than 2 creeps assigned
		if (target.memory.tasks && target.memory.tasks.guard && Object.values(target.memory.tasks.guard).flat().length >= 2)
			return false;

		let isDistanceOk = Game.map.getRoomLinearDistance(creep.room.name, target.room.name) <= 3 && creep.ticksToLive >= 1000;
		if (target.targetOf) {
			let assignedCreeps = target.targetOf.length;
			let flagName = creep.data.destiny.targetName;
			let invadersCore = Game.getObjectById(target.room.invadersCore);
			let invadersCoreHits = invadersCore.hits / invadersCore.hitsMax;
			let needMoreGuard = invadersCoreHits >= 0.4 && assignedCreeps <= 1;
			global.logSystem(creep.room.name, `${creep.name} INVADING: ${target} targetRoom: ${target.room.name} creepTarget: ${Game.flags[flagName].room.name} ret: ${needMoreGuard && isDistanceOk}`);

			let ret = needMoreGuard && isDistanceOk;
			if (ret)
				global.Util.set(target.memory, 'task', 'guard');
			return ret;
		} else if (isDistanceOk) {
			global.Util.set(target.memory, 'task', 'guard');
			global.logSystem(creep.room.name, `${creep.name} INVADING: ${target} targetRoom: ${target.room.name}`);
			return true;
		} else
			return false;
	} else
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

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} INVADING!!! - getting new target`);

	let flag = global.FlagDir.find(global.FLAG_COLOR.invade, creep.pos, false);

	if (!action.isAddableTarget(flag, creep))
		return;

	let destroy = this.getFlaggedStructure(global.FLAG_COLOR.destroy, creep.pos);
	if (destroy) {
		if (destroy.destroyFlag)
			global.Population.registerCreepFlag(creep, destroy.destroyFlag);
		return destroy;
	}

	// move to invasion room
	if (flag && (!flag.room || flag.pos.roomName !== creep.pos.roomName)) {

		// global.logSystem(creep.room.name, `GUARD => ${creep.name} flag: ${flag.name} flagRoom: ${flag.room.name} flag.targetOf: ${flag.targetOf.length}`);

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

		if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} INVADING!!! - select new target`);


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
		if (target)
			return target;
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
	if (global.CHATTY)
		creep.say(this.name);


	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} INVADING!!! - step: ${creep.data.creepType}`);

	let ret;

	// if ((creep.target instanceof Flag) && (creep.target.pos.roomName === creep.pos.roomName))
	// 	ret = this.assign(creep);

	// if (creep.name === 'guard-Flag44-2')
	// 	global.logSystem(creep.room.name, `INVADE => ${creep.name} target: ${creep.target} type: ${creep.data.creepType} assign: ${ret}`);

	ret = action.run[creep.data.creepType](creep);

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name)) {
		global.logSystem(creep.room.name, `${creep.name} INVADING!!! - action ret ${ret}`);
	}

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
		let isNearToFlag = (creep) => {
			if (creep.pos.isNearTo(creep.target)) {
				if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
					global.logSystem(creep.room.name, `${creep.name} INVADING!!! - near to flag ${creep.target}`);
				creep.target = action.newTarget(creep);
				return creep.target;
			}
		}
		if (!creep.flee) {
			if (hasAttack) {
				if (creep.target instanceof Flag) {
					if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
						global.logSystem(creep.room.name, `${creep.name} INVADING!!! - target is a flag ${creep.target} hasAttack`);
					isNearToFlag(creep);
				} else if (creep.target instanceof ConstructionSite) {
					creep.travelTo(creep.target, {range: 0});
					return;
				}
				creep.travelTo(creep.target);
			} else if (hasRangedAttack) {
				if (creep.target instanceof Flag) {
					if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
						global.logSystem(creep.room.name, `${creep.name} INVADING!!! - target is a flag ${creep.target} hasRangedAttack`);
					isNearToFlag(creep);
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
			} else
				creep.flee = true;
		}
		// attack
		if (hasAttack) {
			let attacking = creep.attack(creep.target);
			if (attacking === ERR_NOT_IN_RANGE) {
				let targets = creep.pos.findInRange(creep.room.hostiles, 1);
				if (targets.length > 0)
					creep.attacking = creep.attack(targets[0]) === OK;
			} else creep.attacking = attacking === OK;
		}
		// attack ranged
		if (hasRangedAttack) {
			let targets = creep.pos.findInRange(creep.room.hostiles, 3);
			if (targets.length > 2) { // TODO: precalc damage dealt
				if (global.CHATTY)
					creep.say('MassAttack');
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
	if (_.isUndefined(options.allowHostile))
		options.allowHostile = true;
	return options;
};
