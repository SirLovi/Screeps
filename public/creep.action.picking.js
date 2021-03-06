let action = new Creep.Action('picking');
module.exports = action;
action.maxPerAction = 8;
action.maxPerTarget = 2;
action.isValidAction = function (creep) {
	return (creep.sum < creep.carryCapacity);
};
action.isValidTarget = function (target) {
	return (target != null && target.amount != null && target.amount > 0);
};
action.isAddableAction = function (creep) {
	if (creep.data.creepType.indexOf('remote') > 0)
		return true;
	else return (this.maxPerAction === Infinity || !creep.room.population
		|| !creep.room.population.actionCount[this.name] || creep.room.population.actionCount[this.name] < this.maxPerAction);
};
action.isAddableTarget = function (target, creep) {
	let max;
	if (creep.data.creepType.indexOf('remote') > 0)
		max = Infinity;
	else
		max = this.maxPerTarget;
	let pickers = target.targetOf ? _.filter(target.targetOf, {actionName: 'picking'}) : [];
	return (!target.targetOf || !pickers.length || ((pickers.length < max)
		&& target.amount > _.sum(pickers.map(t => t.carryCapacityLeft))));
};
action.newTarget = function (creep) {
	if (creep.behaviour.needEnergy(creep)) {
		const droppedResources = action.defaultStrategy.energyOnly ? _.filter(creep.room.droppedResources, {resourceType: RESOURCE_ENERGY}) : creep.room.droppedResources;
		let ret = action.lootFilter(droppedResources, creep);
		if (action.isValidTarget(ret) && action.isAddableTarget(ret, creep)) {
			// if (global.DEBUG && global.debugger(global.DEBUGGING.targetRoom, creep.room.name)) {
			// 	global.logSystem(creep.room.name, `${creep.name} droppedResources: ${droppedResources.length}`);
			// 	global.logSystem(creep.room.name, `${creep.name} picking: ${ret}`);
			// }
			return ret;
		} else
			return false;
	} else
		return false;
};
action.work = function (creep) {
	let result = creep.pickup(creep.target);
	if (result === OK) {

		// is there another in range?

		// let loot = creep.pos.findInRange(creep.room.droppedResources, 1, {
		// 	filter: (o) => o.resourceType !== RESOURCE_ENERGY && this.isAddableTarget(o, creep),
		// });
		// if (!loot || loot.length < 1) loot = creep.pos.findInRange(creep.room.droppedResources, 1, {
		// 	filter: (o) => this.isAddableTarget(o, creep),
		// });

		let loot = action.newTarget(creep);

		if (loot && loot.length > 0) {
			this.assign(creep, loot[0]);
			return result;
		}

		// Check for containers to uncharge
		// if (creep.sum < creep.carryCapacity) {
		// 	let containers = creep.pos.findInRange(creep.room.structures.container.in, 2, {
		// 		filter: (o) => Creep.action.uncharging.isValidTarget(o, creep),
		// 	});
		// 	if (containers && containers.length > 0) {
		// 		Creep.action.uncharging.assign(creep, containers[0]);
		// 		return result;
		// 	}
		// }
		// unregister
		this.unassign(creep);
	}
	return result;
};
action.defaultStrategy.energyOnly = true;
