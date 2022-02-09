const mod = new Creep.Behaviour('remoteHauler');
module.exports = mod;
// mod.actions = (creep) => {
// 	if (global.REMOTE_HAULER.RENEW)
// 		return [Creep.action.renewing];
// 	else
// 		return [];
// 	return [Creep.action.renewing];
// };
mod.inflowActions = (creep) => {
	return [
		// Creep.action.renewing,
		Creep.action.picking,
		Creep.action.pickingTombstones,
		Creep.action.uncharging,
	];
};
mod.outflowActions = (creep) => {

	let priority = [
		// Creep.action.renewing,
		Creep.action.feeding,
		Creep.action.charging,
		Creep.action.fueling,
		Creep.action.storing,
		Creep.action.healing,
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
mod.renewCreep = function (creep) {

	if (!global.REMOTE_HAULER.RENEW)
		return false;

	// global.logSystem(creep.pos.roomName, `${creep.name} ttl: ${creep.data.ttl} renewal at: ${creep.data.predictedRenewal * 2} needToRenew: ${creep.data.ttl < creep.data.predictedRenewal * 2}`);

	let ret = this.assignAction(creep, 'renewing');
	global.logSystem(creep.room.name, `RENEWING ret: ${ret} for ${creep.name}`);
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
			return;
		else if (that.assignAction(creep, 'charging', target))
			return;
		else if (that.assignAction(creep, 'storing'))
			return; // prefer storage
	}
	if (that.assignAction(creep, 'charging'))
		return;
	// no deposit :/
	// try spawn & extensions
	if (that.assignAction(creep, 'feeding'))
		return;
	if (that.assignAction(creep, 'dropping'))
		return;
	else {
		const drop = r => {
			if (creep.carry[r] > 0) creep.drop(r);
		};
		_.forEach(Object.keys(creep.carry), drop);
		return this.assignAction(creep, 'idle');
	}
}
mod.nextAction = function (creep) {

	const flag = creep.data.destiny && Game.flags[creep.data.destiny.targetName];
	// global.logSystem(creep.room.name, `ttl: ${creep.data.ttl} predictedRenewal: ${creep.data.predictedRenewal} flag: ${flag}`);


	if (!flag) {
		//TODO: in the future look for a nearby room we can support
		global.logSystem(creep.room.name, `NO FLAG! ${flag}`);
		return Creep.action.recycling.assign(creep);
	} else {
		// at home
		let creepTargetRoomName = Memory.flags[flag.name].roomName;
		let miningRoom = global.Task.mining.memory[creepTargetRoomName];
		let spawnRoomName = miningRoom ? miningRoom.spawnRoomName : false;
		let ret;

		if (creep.pos.roomName === creep.data.homeRoom || (spawnRoomName ? creep.pos.roomName === spawnRoomName : false)) {

			// carrier filled
			if (!this.needEnergy(creep)) {
				return mod.deposit(this, creep);
			} else if (creep.sum > 0) {
				ret = this.nextEnergyAction(creep);
				global.logSystem(creep.room.name, `creep ${creep.name} wants more: ret ${ret}`);
				if (ret)
					return;
				else
					return mod.deposit(this, creep);
			}

			// renew
			if (mod.renewCreep(creep))
				return;

			// travelling
			let gotoTargetRoom = this.gotoTargetRoom(creep);
			if (gotoTargetRoom) {
				return;
			}

		}
		// at target room
		else {
			let casualties = creep.room.casualties.length > 0;

			if (creep.data.destiny.room === creep.pos.roomName) {

				// global.logSystem(creep.room.name, `AT TARGET: ${creep.name}`);

				// TODO: This should perhaps check which distance is greater and make this decision based on that plus its load size

				let ret = false;

				if (casualties) {
					creep.action = Creep.action.healing;
					ret = Creep.behaviour.ranger.heal.call(this, creep);

					ret = ret === 0;

				}
				if (!this.needEnergy(creep)) {
					ret = this.goHome(creep);
				}

				if (!ret && this.needEnergy(creep)) {
					ret = this.nextEnergyAction(creep);
				}

				if (ret)
					return ret;

				return false;

			}
			// somewhere
			else {
				// TODO: This should perhaps check which distance is greater and make this decision based on that plus its load size
				let ret = false;
				let currentRoom = Game.rooms[creep.pos.roomName];

				if (!currentRoom.my) {
					if (!this.needEnergy(creep)) {
						ret = this.goHome(creep);
					}

					if (this.needEnergy(creep)) {
						ret = this.nextEnergyAction(creep);
					} else if (!ret && this.needEnergy(creep)) {
						ret = this.gotoTargetRoom(creep);
					}
				} else {
					if (this.needEnergy(creep)) {
						ret = this.gotoTargetRoom(creep);
					} else if (!this.needEnergy(creep)) {
						ret = this.goHome(creep);
					}
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
mod.needEnergy = function (creep) {
	return creep.sum / creep.carryCapacity < global.REMOTE_HAULER.MIN_LOAD;
};
mod.gotoTargetRoom = function (creep) {
	const targetFlag = creep.data.destiny ? Game.flags[creep.data.destiny.targetName] : null;
	// global.logSystem(creep.room.name, `TARGET FLAG: ${targetFlag}`);
	if (targetFlag)
		return Creep.action.travelling.assignRoom(creep, targetFlag.pos.roomName);
};
mod.goHome = function (creep) {
	return Creep.action.travelling.assignRoom(creep, creep.data.homeRoom);
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
