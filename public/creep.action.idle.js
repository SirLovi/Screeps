let mod = new Creep.Action('idle');
module.exports = mod;
mod.targetRange = 3;
mod.isValidAction = function (creep) {
    return true;
};
mod.isAddableAction = function (creep) {
    return true;
};
mod.isAddableTarget = function (target) {
    return true;
};
mod.newTarget = function (creep) {
    return global.FlagDir.specialFlag();
};
mod.step = function (creep) {
    if (global.CHATTY)
        creep.say(this.name, global.SAY_PUBLIC);
    if (creep.getStrategyHandler([mod.name], 'idleMove', creep))
        creep.idleMove();

    if (_.isUndefined(creep.data.idleCooldown))
        creep.data.idleCooldown = global.COOLDOWN.CREEP_IDLE;
    else
        creep.data.idleCooldown--;

    if (creep.data.idleCooldown === 0 || creep.ticksToLive > 1450) {
        delete creep.data.actionName;
        delete creep.data.targetId;
        delete  creep.data.idleCooldown;
    }

};
mod.defaultStrategy.idleMove = (creep) => true;
