const mod = new Creep.Behaviour('remoteHauler');
module.exports = mod;
// mod.actions = (creep, atHome) => {
//
// 	if (atHome) {
// 		return [
// 			Creep.action.renewing,
// 			Creep.action.gotoTargetRoom(creep),
// 		];
// 	} else {
// 		return [
// 			Creep.action.healing,
// 			Creep.action.gotoTargetRoom(creep),
// 			Creep.action.goHome(creep),
// 		];
// 	}
// 	// return [
// 	// 		// Creep.action.healing,
// 	// 		Creep.action.gotoTargetRoom(creep),
// 	// 		// mod.goHome(creep),
// 	// 	];
//
//
// };
mod.inflowActions = (creep) => {

	// at home
	// if (creep.room.name === creep.data.destiny.homeRoom
	// 	&& (creep.sum / creep.carryCapacity < global.REMOTE_HAULER.MIN_LOAD)) {
	// 	return [
	// 		Creep.action.picking,
	// 		Creep.action.pickingTombstones,
	// 	];
	// }
	return [
		Creep.action.picking,
		Creep.action.uncharging,
		Creep.action.pickingTombstones,
		// Creep.action.healing,
		// Creep.action.renewing,

	];
};
mod.outflowActions = (creep) => {

	let priority = [
		// Creep.action.renewing,
		Creep.action.feeding,
		Creep.action.charging,
		Creep.action.fueling,
		Creep.action.storing,
		// Creep.action.healing,
		// Creep.action.renewing,
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
mod.deposit = (that, creep) => {
	let deposit = []; // deposit energy in...
	// links?
	if (creep.carry.energy === creep.sum)
		deposit = creep.room.structures.links.privateers;
	// storage?
	if (creep.room.storage)
		deposit.push(creep.room.storage);
	// containers?
	if (creep.room.structures.container)
		deposit = deposit.concat(creep.room.structures.container.privateers);
	// Choose the closest
	if (deposit.length > 0) {
		let target = creep.pos.findClosestByRange(deposit);
		if (target.structureType === STRUCTURE_STORAGE && that.assignAction(creep, 'storing', target))
			return true;
		else if (that.assignAction(creep, 'charging', target))
			return true;
		else if (that.assignAction(creep, 'storing'))
			return true; // prefer storage

	}

	if (that.assignAction(creep, 'charging'))
		return true;
	// no deposit :/
	// try spawn & extensions
	if (that.assignAction(creep, 'feeding'))
		return true;
	if (that.assignAction(creep, 'dropping'))
		return true;
	else {
		const drop = r => {
			if (creep.carry[r] > 0) creep.drop(r);
		};
		_.forEach(Object.keys(creep.carry), drop);
		return that.assignAction(creep, 'idle');
	}
};
mod.nextAction = function (creep) {

	// global.logSystem(creep.room.name, `ttl: ${creep.data.ttl} predictedRenewal: ${creep.data.predictedRenewal} flag: ${flag}`);
	let flag = creep.data.destiny && Game.flags[creep.data.destiny.targetName];

	if (_.isUndefined(flag))
		flag = global.FlagDir.find(global.FLAG_COLOR.claim.mining, creep.pos, false);

	let creepTargetRoomName = Memory.flags[flag.name].roomName;
	const homeRoomName = global.Task.mining.strategies.remoteHauler.homeRoomName(creepTargetRoomName);

	// store homeRoom in creep.data
	if (creep.data.destiny.homeRoom !== homeRoomName) {
		creep.data.destiny.homeRoom = homeRoomName;
	}


	if (!flag) {
		//TODO: in the future look for a nearby room we can support
		global.logSystem(creep.room.name, `${creep.name} NO FLAG! ${flag}`);
		return Creep.action.recycling.assign(creep);
	} else if (creep.pos.roomName === creep.data.homeRoom || creep.pos.roomName === homeRoomName || creep.room.my) {
		// at home

		let ret = false;

		// carrier filled
		if (!this.needEnergy(creep, true)) {
			ret = mod.deposit(this, creep);
		} else {
			if (creep.sum > 0) {
				ret = this.nextEnergyAction(creep) && (creep.action.name === 'picking' || creep.action.name === 'pickingTombstones');
				if (global.DEBUG && global.debugger(global.DEBUGGING.remoteHaulersPicking, creep.room.name)) {
					global.logSystem(creep.room.name, `${creep.name} remote nextEnergyAction: ${ret}`);
					global.logSystem(creep.room.name, `${creep.name} remote current action: ${creep.action.name}`);
				}
			}
			else if (!ret) {
				if (this.assignAction(creep, 'renewing')) {
					if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name))
						global.logSystem(creep.room.name, `${creep.name} RENEWING: => ttl: ${creep.data.ttl} action:${creep.action.name}`);
					return true;
				}
			}

		}


		if (!ret) {
			ret = mod.gotoTargetRoom(creep, flag);
		}

		return ret;

	} else if (creep.pos.roomName === creep.data.destiny.room) {

		// at target room

		// TODO: This should perhaps check which distance is greater and make this decision based on that plus its load size

		let ret = false;

		if (this.needEnergy(creep)) {
			ret = this.nextEnergyAction(creep);
			if (global.DEBUG && global.debugger(global.DEBUGGING.targetRoom, creep.room.name)) {
				global.logSystem(creep.room.name, `${creep.name} nextEnergyAction: ${ret}`);
				global.logSystem(creep.room.name, `${creep.name} current action: ${creep.action.name}`);
			}
		}

		if (!ret) {
			ret = mod.goHome(creep, homeRoomName);
		}

		if (!ret) {
			ret = this.assignAction(creep, 'healing');
		}

		return ret;

	} else {
		// somewhere

		// TODO: This should perhaps check which distance is greater and make this decision based on that plus its load size
		let ret = false;

		// if (!this.needEnergy(creep)) {
		// 	ret = this.goHome(creep, homeRoomName);
		// }

		if (this.needEnergy(creep)) {
			ret = this.nextEnergyAction(creep);
		}

		if (!ret) {
			ret = this.gotoTargetRoom(creep, flag);
		}

		if (!ret) {
			ret = this.assignAction(creep, 'healing');
		}

		return ret;
	}

	// fallback
	// recycle self
	let mother = Game.spawns[creep.data.motherSpawn];
	if (mother) {
		global.logSystem(creep.room.name, `RECYCLING: ${creep.name}`);
		this.assignAction(creep, Creep.action.recycling, mother);
	}
};
mod.needEnergy = function (creep, atHome = false) {

	if (creep.data.creepType.indexOf('remote') === 0 && (creep.room.name === creep.data.destiny.homeRoom || creep.room.my))
		if (creep.sum === 0)
			return true;
		else
			return creep.sum / creep.carryCapacity < global.REMOTE_HAULER.MIN_LOAD * 0.25
				&& creep.sum > 0;

	return creep.sum / creep.carryCapacity < global.REMOTE_HAULER.MIN_LOAD;
};
mod.goHome = function (creep, homeRoomName) {
	// global.logSystem(creep.room.name, `${creep.name} is going home ${homeRoomName}`);
	return Creep.action.travelling.assignRoom(creep, homeRoomName);
};
mod.gotoTargetRoom = function (creep, flag) {

	if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
		global.logSystem(creep.room.name, `${creep.name} flag: ${flag} go to target, BEHAVIOUR`);

	if (flag) {
		let ret = Creep.action.travelling.assignRoom(creep, flag.pos.roomName);
		if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} WARRIOR: go to target ret: ${ret}`);
		return ret;
	} else {
		return false;
	}
};

mod.strategies.picking = {
	name: `picking-${mod.name}`,
	energyOnly: false,
};
mod.strategies.defaultStrategy.moveOptions = function (options) {
	options.avoidSKCreeps = true;
	// options.allowHostile = false;
	return options;
};
mod.strategies.healing = {
	name: `healing-${mod.name}`,
	moveOptions: function (options) {
		options.respectRamparts = true;
		return options;
	},
};
