const mod = new Creep.Behaviour('warrior');
module.exports = mod;
const super_invalidAction = mod.invalidAction;
mod.invalidAction = function (creep) {
    return super_invalidAction.call(this, creep) ||
        (creep.action.name === 'guarding' &&
            (!creep.flag || creep.flag.pos.roomName === creep.pos.roomName || creep.leaveBorder())
        );
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
        Creep.action.invading,
        Creep.action.defending,
        Creep.action.healing,
        Creep.action.guarding
    ];
    if (creep.data.destiny.boosted)
        temp.unshift(Creep.action.boosting);
    return temp;
};
mod.selectStrategies = function (actionName) {
    //console.log(`selectStrategies is running on ${actionName}`);
    return [mod.strategies.defaultStrategy, mod.strategies[actionName]];
};
mod.strategies = {
    defaultStrategy: {
        name: `default-${mod.name}`,
        moveOptions: function (options) {
            //console.log(`DEFAULT:`);
            //global.BB(options);
            // // allow routing in and through hostile rooms
            // if (_.isUndefined(options.allowHostile)) options.allowHostile = true;
            return options;
        },
        boosting: {
            isValidMineralType : function (mineralType) {
                console.log('BOOSTING');
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
            }
        },
        defending: {
            name: `defending-${mod.name}`,
            targetFilter: function(creep) {
                return function (hostile) {
                    if (hostile.owner.username === 'Source Keeper') {
                        return creep.pos.getRangeTo(hostile) <= 5;
                    }
                    return true;
                }
            },
            priorityTargetFilter: function(creep) {
                return function(hostile) {
                    if (hostile.owner.username === 'Source Keeper') {
                        return creep.pos.getRangeTo(hostile) <= 5;
                    } else {
                        return hostile.hasBodyparts(ATTACK) || hostile.hasBodyparts(RANGED_ATTACK) || hostile.hasBodyparts(WORK);
                    }
                }
            }
        },
        healing: {
            moveOptions: function (options) {
                console.log('HEALING');
                options.respectRamparts = true;
                return options;
            }
        }
    }
};




