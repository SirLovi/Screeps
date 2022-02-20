let mod = new Creep.Action('guarding');
module.exports = mod;
mod.name = 'guarding';
mod.isAddableAction = function () {
	return true;
};
mod.isAddableTarget = function () {
	return true;
};
mod.reachedRange = 0;
mod.newTarget = function (creep) {

	let flag = creep.flag;

	if (!flag && creep.data.destiny)
		flag = Game.flags[creep.data.destiny.flagName];

	if (!flag) {
		// flag = global.FlagDir.find(global.FLAG_COLOR.defense, creep.pos, false, global.FlagDir.rangeMod, {
		// 	rangeModPerCrowd: 5,
		// 	//rangeModByType: creep.data.creepType
		// });
		flag = global.FlagDir.find(global.FLAG_COLOR.defense, creep.pos, true);

		if (!flag)
			flag = global.FlagDir.find(global.FLAG_COLOR.defense, creep.pos, false);

		if (flag) {
			if (global.DEBUG && global.TRACE)
				global.trace('Action', {creepName: creep.name, flag: flag.name, newTarget: 'assigned flag', [creep.action.name]: 'newTarget', Action: creep.action.name});
			global.Population.registerCreepFlag(creep, flag);
		}
	}

	// if (Room.isSKRoom(creep.pos.roomName) && creep.pos.roomName === creep.flag.pos.roomName) {
	if (creep.pos.roomName === flag.pos.roomName) {

		if (creep.name === 'guard-Flag42-1')
			global.logSystem(creep.room.name, `GUARDiNG!!!`);


		let SKCreeps = _.filter(creep.room.hostiles, hostile => {
			return hostile.owner.username === 'Source Keeper' && (!hostile.targetOf || hostile.targetOf.length === 0);
		});

		if (SKCreeps.length === 0) {

			SKCreeps = _.filter(creep.room.hostiles, hostile => {
				return hostile.owner.username !== 'Source Keeper';
			});

			if (SKCreeps.length > 1)
				return creep.pos.findClosestByPath(SKCreeps);
			else if (SKCreeps.length === 1)
				return SKCreeps[0];
			else if (SKCreeps.length === 0) {
				let otherHostiles = creep.room.hostiles;
				if (otherHostiles.length === 0)
					return _.min(creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR}), 'ticksToSpawn');
				else if (otherHostiles.length === 1)
					return otherHostiles[0];
				else {
					let closestHostile = creep.pos.findClosestByPath(otherHostiles, {
						filter: creep.getStrategyHandler([mod.name], 'priorityTargetFilter', creep),
					});
					global.logSystem(creep.room.name, `closestHostile: ${closestHostile}`);
					return closestHostile;
				}
			}

		} else if (SKCreeps.length > 0) {
			//global.logSystem(creep.room.name, `GUARD ATTACKING A HOSTILE creep!`);
			return creep.pos.findClosestByPath(SKCreeps);
		}
	} else {
		if (creep.name === 'guard-Flag42-1')
			global.logSystem(creep.room.name, `${creep.name} not at targetRoom`);
	}


	if (creep.action && creep.action.name === 'guarding' && creep.flag) {
		return creep.flag;
	}

	if (flag)
		global.Population.registerCreepFlag(creep, flag);

	if (creep.name === 'guard-Flag42-1')
		global.logSystem(creep.room.name, `${creep.name} action: ${creep.action} flag: ${flag}`);

	return flag;
};
mod.work = function (creep) {

	if (creep.data.flagName)
		return OK;
	else
		return ERR_INVALID_ARGS;
};
