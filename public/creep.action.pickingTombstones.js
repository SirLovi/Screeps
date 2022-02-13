let action = new Creep.Action('pickingTombstones');
module.exports = action;
action.maxPerAction = 4;
action.maxPerTarget = 1;
action.isAddableAction = function (creep) {
	// no storage
	//if( !creep.room.storage) return false;
	return (this.maxPerAction === Infinity || !creep.room.population || !creep.room.population.actionCount[this.name] || creep.room.population.actionCount[this.name] < this.maxPerAction);
};
action.isValidAction = function (creep) {
	return (creep.sum < creep.carryCapacity);
};
action.isValidTarget = function (target) {
	return (target != null && (_.sum(target.store) > 0));
	//return target.store || target.energy || target.mineralAmount;
};
action.newTarget = function (creep) {

	// if (!creep.room.storage)
	// 	return creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (o) => this.isValidTarget(o, creep) && (o.store[RESOURCE_ENERGY] > 0)});

	// if (!creep.room.storage)
	// 	return creep.pos.findClosestByPath(FIND_RUINS, {filter: (o) => this.isValidTarget(o, creep) && (o.store[RESOURCE_ENERGY] > 0)});

	// let target = creep.pos.findClosestByPath(FIND_RUINS, {filter: (o) => this.isValidTarget(o, creep)});
	//
	// if (!target)
	// 	target = creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (o) => this.isValidTarget(o, creep)});
	//
	// return target;

	let ret;

	if (creep.behaviour.needEnergy(creep)) {
		const ruins = creep.room.ruins;
		ret = this.filter(creep, ruins);

		if (!ret) {
			const tombStones = creep.room.tombStones;
			ret = this.filter(creep, tombStones);
		}

		if (ret)
			return ret;
		return false;
	}
	return false;

};
action.work = function (creep) {
	let resourceType = _.last(_.sortBy(_.keys(creep.target.store), resourceType => (creep.target.store[resourceType] || 0)));
	if (creep.target == null || _.sum(creep.target.store) < 1)
		return;
	if ((!creep.room.storage) && ((creep.target.store[RESOURCE_ENERGY] == null) || (creep.target.store[RESOURCE_ENERGY] < 1)))
		return;
	let result = creep.withdraw(creep.target, resourceType);
	if (result === OK) {

		if (creep.sum < creep.carryCapacity * 0.8) {
			// is there another in range?
			let loot = creep.pos.findInRange(creep.room.find(FIND_TOMBSTONES), 1, {
				filter: (o) => this.isAddableTarget(o, creep) && ((_.sum(creep.target.store) > 0)),
			});
			if (!loot || loot.length < 1) loot = creep.pos.findInRange(creep.room.find(FIND_TOMBSTONES), 1, {
				filter: (o) => this.isAddableTarget(o, creep) && ((_.sum(creep.target.store) > 0)),
			});
			if (loot && loot.length > 0) {
				this.assign(creep, loot[0]);
				return result;
			}
		}

		delete creep.data.actionName;
		delete creep.data.targetId;
	}
	return result;
};
