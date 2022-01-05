let action = new Creep.Action('guarding');
module.exports = action;
action.isAddableAction = function () {
    return true;
};
action.isAddableTarget = function () {
    return true;
};
action.reachedRange = 0;
action.newTarget = function (creep) {

    let flag;
    if (creep.data.destiny)
        flag = Game.flags[creep.data.destiny.flagName];
    if (!flag) {
        flag = FlagDir.find(FLAG_COLOR.defense, creep.pos, false, FlagDir.rangeMod, {
            rangeModPerCrowd: 400
            //rangeModByType: creep.data.creepType
        });
    }

    // if (Room.isSKRoom(creep.pos.roomName) && creep.pos.roomName === creep.flag.pos.roomName) {
    if (Room.isSKRoom(creep.pos.roomName) && creep.pos.roomName === flag.pos.roomName) {

        let SKCreeps = [],
            otherHostiles = _.filter(creep.room.hostiles, hostile => {
                return hostile.owner.username !== 'Source Keeper';
            });

        if (otherHostiles.length === 0) {

            SKCreeps = _.filter(creep.room.hostiles, hostile => {
                return hostile.owner.username === 'Source Keeper' && (!hostile.targetOf || hostile.targetOf.length === 0);
            });

            if (SKCreeps.length > 1)
                return creep.pos.findClosestByPath(SKCreeps);
            else if (SKCreeps.length === 1)
                return SKCreeps[0];
            else if (SKCreeps.length === 0)
                return _.min(creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR}), 'ticksToSpawn');

        } else if (otherHostiles.length > 0) {
            //global.logSystem(creep.room.name, `GUARD ATTACKING A HOSTILE creep!`);
            return creep.pos.findClosestByPath(otherHostiles);
        }
    }

    if (creep.action && creep.action.name === 'guarding' && creep.flag) {
        //global.logSystem(creep.room.name, `guarding`);
        return creep.flag;
    }

    if (flag) Population.registerCreepFlag(creep, flag);
        return flag;
};
action.work = function (creep) {
    if (creep.data.flagName)
        return OK;
    else return ERR_INVALID_ARGS;
};
