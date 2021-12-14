let action = new Creep.Action('pickingTombstones');
module.exports = action;
action.maxPerAction = 4;
action.maxPerTarget = 2;
action.isValidAction = function(creep){
    return ( creep.sum < creep.carryCapacity );
};
action.isValidTarget = function(target){
    return (target != null && (_.sum(target.store) > 1));
};
action.newTarget = function(creep) {
    let target = creep.room.find(FIND_TOMBSTONES)[0];
    return target;
};
action.work = function(creep){
    let resourceType = _.last(_.sortBy(_.keys(creep.target.store), resourceType => (creep.target.store[resourceType] || 0)));
    return creep.withdraw(creep.target, resourceType);
};
