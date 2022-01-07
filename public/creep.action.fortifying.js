let mod = new Creep.Action('fortifying');
module.exports = mod;
mod.maxPerTarget = 1;
mod.maxPerAction = 2;
mod.targetRange = 3;
mod.isValidAction = function(creep){
    return creep.carry.energy > 0 && (!creep.room.storage || !creep.room.storage.active || creep.room.nuked || creep.room.storage.charge > global.STORAGE_CHARGE_FORTIFYING);
};
mod.isValidTarget = function(target){
    return (target && target.active && target.hits && target.hits < target.hitsMax);
};
mod.newTarget = function(creep){
    let that = this;
    let isAddable = target => that.isAddableTarget(target, creep);
    return _.find(creep.room.structures.fortifyable, isAddable);
};
mod.work = function(creep){
    return creep.repair(creep.target);
};
