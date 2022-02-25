const mod = new Creep.Behaviour('remoteHauler');
module.exports = mod;
// mod.actions = (creep) => {
// 	return [
// 		Creep.action.healing,
// 	];
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
// mod.selectInflowAction = function (creep) {
// 	const p = Util.startProfiling('selectInflowAction' + creep.name, {enabled: PROFILING.BEHAVIOUR});
// 	const actionChecked = {};
// 	const outflowActions = this.outflowActions(creep);
// 	for (const action of this.inflowActions(creep)) {
// 		if (!actionChecked[action.name]) {
// 			actionChecked[action.name] = true;
// 			if (this.assignAction(creep, action, undefined, outflowActions)) {
// 				p.checkCPU('assigned' + action.name, 1.5);
// 				return;
// 			}
// 		}
// 	}
// 	if (creep.room.name !== creep.data.homeRoom) {
// 		p.checkCPU('!assigned', 1.5);
// 		return Creep.action.idle.assign(creep);
// 	}
// };
mod.renewCreep = function (creep) {

	let renewCreep = global.RENEW[creep.data.creepType];
	if (!renewCreep.renew)
		return false;

	let ret = false;

	// if (!global.debugger(global.DEBUGGING.renewing, creep.room.name))
	// 	return false;

	if (!creep.data.predictedRenewal)
		creep.data.predictedRenewal = creep.data.spawningTime;

	if (creep.data.ttl < creep.data.predictedRenewal * renewCreep.prMultiplier) {
		global.logSystem(creep.pos.roomName, `${creep.name} ttl: ${creep.data.ttl} renewal at: ${creep.data.predictedRenewal * renewCreep.prMultiplier} needToRenew: true`);
		ret = this.assignAction(creep, 'renewing');
		global.logSystem(creep.room.name, `RENEWING ret: ${ret} for ${creep.name}`);
	}

	return ret;

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
	let casualties = creep.room.casualties.length > 0;

	// store homeRoom in creep.data
	if (creep.data.destiny.homeRoom !== homeRoomName) {
		creep.data.destiny.homeRoom = homeRoomName;
	}


	if (!flag) {
		//TODO: in the future look for a nearby room we can support
		global.logSystem(creep.room.name, `${creep.name} NO FLAG! ${flag}`);
		return Creep.action.recycling.assign(creep);
	} else {
		// at home
		if (creep.pos.roomName === creep.data.homeRoom || creep.pos.roomName === homeRoomName || creep.room.my) {

			let ret = false;

			// carrier filled
			if (!this.needEnergy(creep, true)) {
				return mod.deposit(this, creep);
			}
			if (this.needEnergy(creep, true))
				// && creep.data.creepType.indexOf('remote') === 0)
			{
				if (creep.sum > 0) {
					ret = this.nextEnergyAction(creep) && creep.action.name !== 'idle';
					if (ret && global.DEBUG && global.debugger(global.DEBUGGING.remoteHaulersPicking, creep.room.name)) {
						global.logSystem(creep.room.name, `${creep.name} remote nextEnergyAction: ${ret}`);
						global.logSystem(creep.room.name, `${creep.name} remote current action: ${creep.action.name}`);
						return ret;
					}
				}

				// else {
				// 	return this.gotoTargetRoom(creep, flag);
				// 	// global.logSystem(creep.room.name, `${creep.name} go to target: ret ${ret}`);
				//
				// }
			}

			if (this.renewCreep(creep)) {
				global.logSystem(creep.room.name, `${creep.name} ${creep.data.ttl} renewing`);
				return true;
			}

			// travelling
			return this.gotoTargetRoom(creep, flag);


		}
		// at target room
		else {

			if (creep.pos.roomName === creep.data.destiny.room) {

				// global.logSystem(creep.room.name, `AT TARGET: ${creep.name}`);

				// TODO: This should perhaps check which distance is greater and make this decision based on that plus its load size

				let ret = false;

				if (casualties) {
					creep.action = Creep.action.healing;
					ret = Creep.behaviour.ranger.heal.call(this, creep);

				}
				if (!ret && !this.needEnergy(creep)) {
					ret = this.goHome(creep, homeRoomName);
				}

				if (!ret && this.needEnergy(creep)) {
					ret = this.nextEnergyAction(creep);
					if (global.DEBUG && global.debugger(global.DEBUGGING.targetRoom, creep.room.name)) {
						global.logSystem(creep.room.name, `${creep.name} nextEnergyAction: ${ret}`);
						global.logSystem(creep.room.name, `${creep.name} current action: ${creep.action.name}`);
					}
				}

				if (ret)
					return ret;

				return false;

			}
			// somewhere
			else {
				// TODO: This should perhaps check which distance is greater and make this decision based on that plus its load size
				let ret = false;
				// let currentRoom =


				if (casualties) {
					creep.action = Creep.action.healing;
					ret = Creep.behaviour.ranger.heal.call(this, creep);

				}

				if (!this.needEnergy(creep)) {
					ret = this.goHome(creep, homeRoomName);
				}

				if (this.needEnergy(creep)) {
					ret = this.nextEnergyAction(creep);
				} else if (!ret && this.needEnergy(creep)) {
					ret = this.gotoTargetRoom(creep, flag);
				}

				if (ret)
					return ret;

				return false;
			}
		}
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
mod.gotoTargetRoom = function (creep, flag) {
	// global.logSystem(creep.room.name, `TARGET FLAG: ${targetFlag}`);
	if (flag) {
		return Creep.action.travelling.assignRoom(creep, flag.pos.roomName);
	} else {
		return false;
	}
};
mod.goHome = function (creep, homeRoomName) {
	// global.logSystem(creep.room.name, `${creep.name} is going home ${homeRoomName}`);
	return Creep.action.travelling.assignRoom(creep, homeRoomName);
};

mod.strategies.picking = {
	name: `picking-${mod.name}`,
	energyOnly: false,
};
mod.strategies.defaultStrategy.moveOptions = function (options) {
	options.avoidSKCreeps = true;
	return options;
};
mod.strategies.healing = {
	name: `healing-${mod.name}`,
	moveOptions: function (options) {
		options.respectRamparts = true;
		return options;
	},
};
