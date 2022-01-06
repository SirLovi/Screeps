let action = new Creep.Action('storing');

module.exports = action;
action.isValidAction = function (creep) {
	return creep.room.storage && creep.room.storage.isActive() && creep.room.terminal && creep.room.terminal.isActive() && creep.sum > 0;
};
action.isValidTarget = function (target) {
	return target && target.store && target.active && target.sum < target.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO;
};
action.isAddableTarget = function (target, creep) {

	// return (target.my &&
	// 	(!target.targetOf || target.targetOf.length < this.maxPerTarget)
	// 	&& target.sum + creep.carry[RESOURCE_ENERGY] < target.store.getCapacity());

	return (target.my &&
		(!target.targetOf || target.targetOf.length < this.maxPerTarget)
		&& target.sum + creep.carry[RESOURCE_ENERGY] < target.store.getCapacity());

};
action.isValidMineralToTerminal = function (room, mineral) {

	if (mineral === RESOURCE_ENERGY)
		return false;

	let mineralIsCompound = global.isCompoundToManage(mineral);
	let storedMineral = room.storage.store[mineral];
	let ret;


	let isStorageFull = room.storage.sum > global.storageCapacity * global.TARGET_STORAGE_SUM_RATIO,
		terminalSum = room.terminal.sum - room.terminal.store.energy + Math.max(room.terminal.store.energy, global.TERMINAL_ENERGY),
		isTerminalFreeSpace =  terminalSum < global.terminalCapacity * global.TARGET_STORAGE_SUM_RATIO;

	if (!mineralIsCompound) {
		if (mineral === room.mineralType) {
			ret = (storedMineral || 0)
				// storage near to full or stored too much mineral
				&& (isStorageFull || storedMineral > global.MAX_STORAGE_MINERAL)
				// terminal have more than 30.000 free space
				&& isTerminalFreeSpace;

			// global.logSystem(room.name, `isValidToTerminal ROOM Mineral: ${mineral} RET: ${ret}`);

		} else {
			ret = (storedMineral || 0)
				&& (isStorageFull || storedMineral > global.MAX_STORAGE_NOT_ROOM_MINERAL)
				&& isTerminalFreeSpace;

			// global.logSystem(room.name, `isValidToTerminal NOT ROOM Mineral: ${mineral} RET: ${ret}`);
		}

	} else if (Memory.compoundsManage[mineral] && Memory.compoundsManage[mineral].sell) {
		let maxAmountToStore = Memory.compoundsManage[mineral].roomThreshold + Memory.compoundsManage[mineral].reservedAmount;
		ret = (storedMineral || 0)
			&& (isStorageFull || storedMineral > maxAmountToStore)
			&& isTerminalFreeSpace;

		// global.logSystem(room.name, `isValidToTerminal COMPOUND: ${mineral} RET: ${ret}`);
	} else {
		ret = (storedMineral || 0)
			&& isStorageFull
			&& isTerminalFreeSpace;
	}

	if (room.name === 'E23S14' && mineral === 'XGH2O') {

		// global.logSystem(room.name, `isCompound: ${mineralIsCompound}`);
		// global.logSystem(room.name, `stored: ${storedMineral || 0}`);
		// global.logSystem(room.name, `max amount to store: ${Memory.compoundsManage[mineral].roomThreshold + Memory.compoundsManage[mineral].reservedAmount}`);
		// global.logSystem(room.name, `isTerminalFreeSpaceForMineral: ${isTerminalFreeSpaceForMineral}`);
		// global.logSystem(room.name, `isTerminalFreeSpace: ${isTerminalFreeSpace}`);

		if (ret)
			global.logSystem(room.name, `mineral ${mineral} to terminal is OK`);
		else
			global.logSystem(room.name, `mineral ${mineral} to terminal is NOT OK`);
	}

	return ret;

};
action.newTarget = function (creep) {

	// if (creep.room.name === 'E15S3') {
	// 	global.logSystem(creep.room.name, `creep search new target: ${creep.name}`);
	// 	global.logSystem(creep.room.name, `creep carries: ${global.json(creep.carries)}`);
	//
	// }

	let sendMineralToTerminal = function (creep) {

			for (const mineral in creep.room.storage.store) {
				let validMineral = action.isValidMineralToTerminal(creep.room, mineral);
				// if (creep.room.name === 'E15S3' && validMineral) {
				// 	// console.log(`creep.carry[mineral]: ${creep.carry[mineral]}`);
				// 	// console.log(`creep.carry[mineral] > 0: ${creep.carry[mineral] > 0}`);
				// 	console.log(`creep: ${creep.name} mineral: ${mineral} valid: ${validMineral} carryMineral: ${creep.carry[mineral] > 0}`);
				// }


				if (creep.carry[mineral] > 0 && validMineral)
					return true;
			}
			return false;
		},
		sendEnergyToTerminal = creep => (
			creep.carry.energy > 0 &&
			creep.room.storage.charge > 0.5 &&
			creep.room.terminal.store.energy < global.TERMINAL_ENERGY &&
			creep.room.terminal.sum < creep.room.terminal.store.getCapacity());


	let mineralToTerminal = sendMineralToTerminal(creep);
	let energyToTerminal = sendEnergyToTerminal(creep);


	// let labTech = creep.name.includes('labTech');

	// if (creep.room.name === 'E15S3') {
	//
	// 	console.log(`STORING E15S3`);
	//
	// 	console.log(`lastAction: ${creep.name} ${creep.data.lastAction}`);
	//
	// 	global.logSystem(creep.name, `maxTarget: ${this.maxPerTarget}`);
	//
	//
	// 	global.logSystem(creep.room.name, `creep: ${creep.name}`);
	// 	global.logSystem(creep.room.name, `sendMineralToTerminal: ${mineralToTerminal}`);
	// 	global.logSystem(creep.room.name, `sendEnergyToTerminal: ${energyToTerminal}`);
	// 	global.logSystem(creep.room.name, `addableTerminal: ${action.isAddableTarget(creep.room.terminal, creep)}`);
	// 	global.logSystem(creep.room.name, `addableStorage: ${action.isAddableTarget(creep.room.storage, creep)}`);
	//
	// 	global.logSystem(creep.room.name, `isValidTarget_TERMINAL: ${creep.room.terminal && creep.room.terminal.active &&
	// 	(mineralToTerminal || energyToTerminal)
	// 	&& action.isAddableTarget(creep.room.terminal, creep)}`);
	//
	// 	global.logSystem(creep.room.name, `isValidTarget_STORAGE: ${this.isValidTarget(creep.room.storage)
	// 	&& action.isAddableTarget(creep.room.storage, creep)}`);
	//
	//
	// }


	if (creep.room.terminal && creep.room.terminal.active &&
		(mineralToTerminal || energyToTerminal)
		&& action.isAddableTarget(creep.room.terminal, creep)) {
		return creep.room.terminal;

	} else if (this.isValidTarget(creep.room.storage) && action.isAddableTarget(creep.room.storage, creep))
		return creep.room.storage;

	return null;
};
action.work = function (creep) {
	let workResult,
		amount;
	for (let resourceType in creep.carry) {

		// if (creep.room.name === 'E15S3')
		// 	global.logSystem(creep.room.name, `real target: ${creep.target.structureType}`);

		if (creep.target.structureType === STRUCTURE_TERMINAL) {
			// if (creep.room.name === 'E15S3')
			// 	global.logSystem(creep.room.name, `Target: TERMINAL`);
			amount = Math.min(Math.abs(creep.room.terminal.getNeeds(resourceType)), creep.carry[resourceType]);
		}
		else if (creep.target.structureType === STRUCTURE_STORAGE) {
			// if (creep.room.name === 'E15S3')
			// 	global.logSystem(creep.room.name, `Target: STORAGE`);
			amount = Math.min(Math.abs(creep.room.storage.getNeeds(resourceType)), creep.carry[resourceType]);
		}

		// if (creep.room.name === 'E15S3')
		// 	global.logSystem(creep.room.name, `target: ${creep.target.id} ${amount} ${resourceType}`);

		if (creep.carry[resourceType] > 0) {
			workResult = creep.transfer(creep.target, resourceType, amount);
			// if (creep.room.name === 'E15S3')
			// 	global.logSystem(creep.room.name, `workResult: ${global.translateErrorCode(workResult)}`);
			if (workResult !== OK)
				break;
		}
	}
	delete creep.data.actionName;
	delete creep.data.targetId;
	return workResult;
};
