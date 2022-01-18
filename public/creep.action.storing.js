let mod = new Creep.Action('storing');
module.exports = mod;

mod.isValidAction = function (creep) {
    return creep.room.storage && creep.room.storage.isActive() && creep.room.terminal && creep.room.terminal.isActive() && creep.sum > 0;
};
mod.isValidTarget = function (target) {
    return target && target.store && target.active && target.sum < target.store.getCapacity() * global.TARGET_STORAGE_SUM_RATIO;
};
mod.isAddableTarget = function (target, creep) {

    return (target.my &&
        (!target.targetOf || target.targetOf.length < this.maxPerTarget)
        && target.sum + creep.carry[RESOURCE_ENERGY] < target.store.getCapacity());

};
mod.isValidMineralToTerminal = function (room, mineral) {

    if (mineral === RESOURCE_ENERGY)
        return false;

    if(!room.storage || !room.terminal)
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

    return ret;

};
mod.newTarget = function (creep) {

    let sendMineralToTerminal = function (creep) {

            for (const mineral in creep.room.storage.store) {
                let validMineral = mod.isValidMineralToTerminal(creep.room, mineral);

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


    if (creep.room.terminal && creep.room.terminal.active &&
        (mineralToTerminal || energyToTerminal)
        && mod.isAddableTarget(creep.room.terminal, creep)) {
        return creep.room.terminal;

    } else if (this.isValidTarget(creep.room.storage) && mod.isAddableTarget(creep.room.storage, creep))
        return creep.room.storage;

    return null;
};
mod.work = function (creep) {
    let workResult,
        amount;
    for (let resourceType in creep.carry) {


        if (creep.target.structureType === STRUCTURE_TERMINAL) {

            amount = Math.min(Math.abs(creep.room.terminal.getNeeds(resourceType)), creep.carry[resourceType]);
        }
        else if (creep.target.structureType === STRUCTURE_STORAGE) {

            amount = Math.min(Math.abs(creep.room.storage.getNeeds(resourceType)), creep.carry[resourceType]);
        }

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
