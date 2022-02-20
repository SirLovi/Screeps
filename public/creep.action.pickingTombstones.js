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

action.resourcesWithLoot = (resources, creep, energyOnly) => {
	let loots;

	if (energyOnly) {
		loots = _.filter(resources, resource => {
			return action.isValidTarget(resource, creep) && (resource.store[RESOURCE_ENERGY] > 0);
		});
	} else {
		loots = _.filter(resources, resource => {
			return action.isValidTarget(resource, creep);
		});
	}

	if (loots.length === 0)
		return false;
	else
		return action.lootFilter(loots, creep);
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

	if (creep.behaviour.name === 'remoteHauler' && creep.behaviour.needEnergy(creep)) {

		let ruins = creep.room.ruins;

		ret = this.resourcesWithLoot(ruins, creep, action.defaultStrategy.energyOnly);

		if (!ret) {
			let tombStones = creep.room.tombStones;
			ret = this.resourcesWithLoot(tombStones, creep, action.defaultStrategy.energyOnly);
		}
		if (ret) {
			if (global.DEBUG && global.debugger(global.DEBUGGING.targetRoom, creep.room.name)) {
				global.logSystem(creep.room.name, `${creep.name} tombStones: ${ret.length}`);
				global.logSystem(creep.room.name, `${creep.name} picking: ${ret}`);
			}
			return ret;
		}
		return false;
	}
	return false;

};
action.work = function (creep) {

	if (creep.target == null || _.sum(creep.target.store) < 1)
		return;

	let resourceType = _.last(_.sortBy(_.keys(creep.target.store), resourceType => (creep.target.store[resourceType] || 0)));

	// if ((!creep.room.storage) && ((creep.target.store[RESOURCE_ENERGY] == null) || (creep.target.store[RESOURCE_ENERGY] < 1)))
	// 	return;

	let result = creep.withdraw(creep.target, resourceType);

	if (result === OK) {

		// is there another in range?

		// let loot = creep.pos.findInRange(creep.room.find(FIND_TOMBSTONES), 1, {
		// 	filter: (o) => this.isAddableTarget(o, creep) && ((_.sum(creep.target.store) > 0)),
		// });

		let loot = action.newTarget(creep);

		// if (!loot || loot.length < 1) loot = creep.pos.findInRange(creep.room.find(FIND_TOMBSTONES), 1, {
		// 	filter: (o) => this.isAddableTarget(o, creep) && ((_.sum(creep.target.store) > 0)),
		// });

		if (loot && loot.length > 0) {
			this.assign(creep, loot[0]);
			return result;
		}

		this.unassign(creep);
	}
	return result;
};
action.defaultStrategy.energyOnly = false;
