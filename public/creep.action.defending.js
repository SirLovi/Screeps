let mod = new Creep.Action('defending');
module.exports = mod;
mod.isValidAction = function (creep) { return creep.room.hostiles.length > 0; };
mod.isAddableAction = function () { return true; };
mod.isAddableTarget = function () { return true; };
mod.isValidTarget = function (target) {
    return (
        target &&
        target.hits != null &&
        target.hits > 0 &&
        target.my === false);
};
mod.newTarget = function (creep) {
    let closestHostile = creep.pos.findClosestByRange(creep.room.hostiles, {
        filter: creep.getStrategyHandler([mod.name], 'priorityTargetFilter', creep)
    });
    if (!closestHostile) {
        closestHostile = creep.pos.findClosestByRange(creep.room.hostiles, {
            filter: creep.getStrategyHandler([mod.name], 'targetFilter', creep)
        });
    }
    return closestHostile;
};
mod.step = function (creep) {
    if (global.CHATTY)
        creep.say(this.name, global.SAY_PUBLIC);
    if (creep.target.pos.roomName !== creep.room.name)
        return Creep.action.travelling.assignRoom(creep, creep.target.pos.roomName);
    this.run[creep.data.creepType](creep);
};
mod.makeRangedAttack = function (creep) {
    let targets = creep.pos.findInRange(creep.room.hostiles, 3);
    if (targets.length > 2) { // TODO: precalc damage dealt
        if (global.CHATTY) creep.say('MassAttack');
        creep.attackingRanged = creep.rangedMassAttack() === OK;
    } else if (range < 4) {
        creep.attackingRanged = creep.rangedAttack(creep.target) === OK;
    } else if (targets.length > 0) {
        creep.attackingRanged = creep.rangedAttack(targets[0]) === OK;
    }
};
mod.makeMeleeAttack = function (creep) {
    let attacking = creep.attack(creep.target);
    if (attacking === ERR_NOT_IN_RANGE) {
        let targets = creep.pos.findInRange(creep.room.hostiles, 1);
        if (targets.length > 0) creep.attacking = creep.attack(targets[0]) === OK;
    } else
        creep.attacking = attacking === OK;
};
mod.run = {
    ranger: function (creep) {
        let range = creep.pos.getRangeTo(creep.target);
        if (!creep.flee) {
            if (range > 3) {
                creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
            }
            if (range < 3) creep.fleeMove();
        }

        // attack ranged
        mod.makeRangedAttack(creep);
    },
    sourceKiller: function (creep) {
        const range = creep.pos.getRangeTo(creep.target);
        if (!creep.flee && ((creep.hits === creep.hitsMax || range <= 3) || range > 4)) {
            creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
        }
        // attack
        mod.makeMeleeAttack(creep)
    },
    melee: function (creep) {
        if (!creep.flee && creep.pos.getRangeTo(creep.target) > 1) {
            creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
        }
        // attack
        mod.makeMeleeAttack(creep);
    },
    warrior: function (creep) {

        //if (creep.target.owner.username === 'Invader')
        //    global.logSystem(creep.room.name, `Hello Warrior ${creep.name}`);

        let range = creep.pos.getRangeTo(creep.target);
        let hasAttack = creep.hasActiveBodyparts(ATTACK);
        let hasRangedAttack = creep.hasActiveBodyparts(RANGED_ATTACK);
        if (!creep.flee) {
            if (hasAttack) {
                if (range > 1) {
                    creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
                }
            } else if (hasRangedAttack) {
                if (range > 3) {
                    creep.travelTo(creep.target, {respectRamparts: global.COMBAT_CREEPS_RESPECT_RAMPARTS});
                }
                if (range < 3) creep.fleeMove();
            } else creep.flee = true;
        }
        // attack
        if (hasAttack || (creep.body.length > 0 && !hasRangedAttack && !hasAttack)) {
            mod.makeMeleeAttack(creep);
        }
        // attack ranged
        if (hasRangedAttack) {
            mod.makeRangedAttack(creep)
        }
    },
};
mod.defaultStrategy.priorityTargetFilter = function (creep) {
    return function (hostile) {
        return hostile.hasBodyparts(HEAL);
    }
};
mod.defaultStrategy.targetFilter = function (creep) {
    return function (hostile) {
        if (hostile.owner.username === 'Source Keeper') {
            return creep.pos.getRangeTo(hostile) <= 5;
        }
        return true;
    };
};
