const mod = new Creep.Behaviour('hauler');
module.exports = mod;
// mod.actions = (creep) => {
// 	return [
// 		Creep.action.renewing,
// 	];
// };
mod.inflowActions = (creep) => {
	if (creep.room.situation.invasion) {
		return [
			Creep.action.uncharging,
			Creep.action.withdrawing,
			Creep.action.reallocating,
		];
	}
	return [
		Creep.action.uncharging,
		Creep.action.picking,
		Creep.action.pickingTombstones,
		Creep.action.withdrawing,
		Creep.action.reallocating,
	];
};
mod.outflowActions = (creep) => {
	let priority = [
		Creep.action.feeding,
		Creep.action.storing,
		Creep.action.charging,
		Creep.action.fueling,
	];
	if (creep.sum > creep.carry.energy ||
		(!creep.room.situation.invasion &&
			global.SPAWN_DEFENSE_ON_ATTACK && creep.room.conserveForDefense && creep.room.relativeEnergyAvailable > 0.8)) {
		priority.unshift(Creep.action.storing);
	}
	if (creep.room.structures.urgentRepairable.length > 0) {
		priority.unshift(Creep.action.fueling);
	}
	return priority;
};
mod.needEnergy = function (creep) {
	// return creep.sum / creep.carryCapacity < global.REMOTE_HAULER.MIN_LOAD;
	return creep.sum / creep.carryCapacity < 0.5;
};
mod.nextAction = function (creep) {
	if (creep.pos.roomName !== creep.data.homeRoom && Game.rooms[creep.data.homeRoom] && Game.rooms[creep.data.homeRoom].controller) {
		return Creep.action.travelling.assignRoom(creep, creep.data.homeRoom);
	}
	if (creep.sum === 0 && this.assignAction(creep, 'renewing')) {
		if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} RENEWING: => ttl: ${creep.data.ttl} action:${creep.action.name}`);
		return true;
	}
	return this.nextEnergyAction(creep);
};
mod.strategies.picking = {
	name: `picking-${mod.name}`,
	energyOnly: false,
};
