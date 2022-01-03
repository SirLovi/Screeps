let mod = {};
module.exports = mod;
mod.newTargetNuker = function(creep) {
    let room = creep.room;
    // check nukers for needs and make sure to empty the nuker before filling
    for (const nuker of room.structures.nukers.all) {
        var amount = 0;
        amount = nuker.getNeeds(RESOURCE_ENERGY);
        if (amount > 0) {
            // nuker needs energy so find a lower priority container with some
            if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: nuker.id, resourceType: RESOURCE_ENERGY, needs: amount });
            if (room.storage && room.storage.charge > 0.5) {
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.storage.id, resourceType: RESOURCE_ENERGY, targetNeeds: room.storage.store[RESOURCE_ENERGY] });
                creep.data.reallocating = RESOURCE_ENERGY;
                return room.storage;
            }
            if (room.terminal && room.terminal.getNeeds(RESOURCE_ENERGY) < 0) {
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.terminal.id, resourceType: RESOURCE_ENERGY, targetNeeds: room.terminal.store[RESOURCE_ENERGY] });
                creep.data.reallocating = RESOURCE_ENERGY;
                return room.terminal;
            }
            let ret = null; //room.findContainerWith(RESOURCE_ENERGY);
            if (ret) {
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: ret.structure.id, resourceType: RESOURCE_ENERGY, targetNeeds: ret.amount });
                creep.data.reallocating = RESOURCE_ENERGY;
                return ret.structure;
            }
        }
        amount = nuker.getNeeds(RESOURCE_GHODIUM);
        if (amount > 0) {
            // nuker needs ghodium so find a lower priority container with some
            if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, structureId: nuker.id, resourceType: RESOURCE_GHODIUM, needs: amount });
            if (room.storage && room.storage.store[RESOURCE_GHODIUM]) {
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.storage.id, resourceType: RESOURCE_GHODIUM, targetNeeds: room.storage.store[RESOURCE_GHODIUM] });
                creep.data.reallocating = RESOURCE_GHODIUM;
                return room.storage;
            }
            if (room.terminal && room.terminal.getNeeds(RESOURCE_GHODIUM) < 0) {
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: room.terminal.id, resourceType: RESOURCE_GHODIUM, targetNeeds: room.terminal.store[RESOURCE_GHODIUM] });
                creep.data.reallocating = RESOURCE_GHODIUM;
                return room.terminal;
            }
            let ret = null; //room.findContainerWith(RESOURCE_GHODIUM);
            if (ret) {
                if (DEBUG && TRACE) trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, targetStructureId: ret.structure.id, resourceType: RESOURCE_GHODIUM, targetNeeds: ret.amount });
                creep.data.reallocating = RESOURCE_GHODIUM;
                return ret.structure;
            }
            if (ROOM_TRADING && !global.MAKE_COMPOUNDS && !global.ALLOCATE_COMPOUNDS) {

                const orderCreated = _.some(room.memory.resources.orders, {'type':RESOURCE_GHODIUM});

                if (!orderCreated) {
                    let ret = room.placeRoomOrder(nuker.id, RESOURCE_GHODIUM, amount);
                    if (global.DEBUG && ret === OK)
                        global.logSystem(room.name, `${creep.name} started a room order of ${amount} ${RESOURCE_GHODIUM} for nuker ${nuker.id}`);
                }
            }
        }
    }
    return null;
};

mod.findNeeding = function(room, resourceType, amountMin, structureId){
    if (!amountMin) amountMin = 1;
//    if (!RESOURCES_ALL.find((r)=>{r==resourceType;})) return ERR_INVALID_ARGS;

    const labs = room.structures.labs.all;
    if (labs.length > 0) {
        for (let i = 0; i < labs.length; i++) {
            const lab = Game.getObjectById(labs[i].id);
            let amount = 0;
            if (lab)
                amount = lab.getNeeds(resourceType);
            if (amount >= amountMin && (lab.mineralAmount === 0 || lab.mineralType == resourceType || resourceType == RESOURCE_ENERGY) && lab.id != structureId) {
                return { structure: lab, amount: amount};
            }
        }
    }
    const powerSpawns = room.structures.powerSpawns.all;
    if (powerSpawns.length > 0) {
        for (let i = 0; i < powerSpawns.length; i++) {
            const powerSpawn = Game.getObjectById(powerSpawns[i].id);
            let amount = 0;
            if (powerSpawn) amount = powerSpawn.getNeeds(resourceType);
            if (amount >= amountMin && (resourceType == RESOURCE_POWER || resourceType == RESOURCE_ENERGY) && powerSpawn.id != structureId) {
                return { structure: powerSpawn, amount: amount};
            }
        }
    }
    for (const nuker of room.structures.nukers.all) {
        let amount = 0;
        if (nuker) amount = nuker.getNeeds(resourceType);
        if (amount >= amountMin && (resourceType == RESOURCE_GHODIUM || resourceType == RESOURCE_ENERGY) && nuker.id != structureId) {
            return { structure: nuker, amount: amount};
        }
    }
    const containers = room.structures.container.all;
    if (containers.length > 0) {
        for (let i = 0; i < containers.length; i++) {
            const container = Game.getObjectById(containers[i].id);
            let amount = 0;
            if (container) amount = container.getNeeds(resourceType);
            if (amount >= amountMin && container.id != structureId) {
                return { structure: container, amount: amount };
            }
        }
    }
    const terminal = room.terminal;
    if (terminal) {
        let amount = terminal.getNeeds(resourceType);
        if (amount >= amountMin && terminal.id != structureId) {
            return { structure: terminal, amount: amount };
        }
    }
    let storage = room.storage;
    if (storage) {
        let amount = storage.getNeeds(resourceType);
        if (amount >= amountMin && storage.id != structureId) {
            return { structure: storage, amount: amount };
        }
    }

    // no specific needs found ... check for overflow availability
    if (storage && (resourceType == RESOURCE_ENERGY || resourceType == RESOURCE_POWER) && storage.store.getCapacity()-storage.sum > amountMin) {
        return { structure: storage, amount: 0 };
    }
    if (terminal && resourceType != RESOURCE_ENERGY && resourceType != RESOURCE_POWER && terminal.store.getCapacity()-terminal.sum > amountMin) {
        return { structure: terminal, amount: 0 };
    }

    // no destination found
    return null;
};
mod.newTarget = function(creep){
    let room = creep.room;
    if (global.DEBUG && global.TRACE)
        global.trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, subAction: 'newTarget' });
    let target = null;
    if( creep.sum === 0) {
        let data = room.memory;
        if (data) {
            target = this.newTargetTerminal(creep);
            if (target === null)
                target = this.newTargetLab(creep);
            if (target === null)
                target = this.newTargetPowerSpawn(creep);
            if (target === null)
                target = this.newTargetContainer(creep);
            if (target === null)
                target = this.newTargetStorage(creep);
            if (target === null)
                target = this.newTargetNuker(creep);
        }
        return target;
    }
    else {
        // find destination for carried resource
        let resourceType = Object.keys(creep.carry)[0];
        let needing = this.findNeeding(room, resourceType);
        if (needing) {
            if (global.DEBUG && global.TRACE)
                global.trace('Action', { actionName: 'reallocating', roomName: room.name, creepName: creep.name, subAction: 'assignDropOff', targetStructureId: needing.structure.id, resourceType: resourceType, targetNeeds: needing.amount });
            return needing.structure;
        }
        return null;
    }
};
mod.unloadNuker = function(creep) {
    let target = creep.target;
    let workResult = null;
    let resource = null;
    let amount = 0;
    amount = -target.getNeeds(RESOURCE_ENERGY);
    if (amount > 0)
        resource = RESOURCE_ENERGY;
    if (!resource) {
        amount = -target.getNeeds(RESOURCE_GHODIUM)
        if (amount > 0)
            resource = RESOURCE_GHODIUM;
    }
    if (resource) {
        workResult = this.unloadStructure(creep, target, resource, amount);
    }
    if (workResult === OK) {
        this.assignDropOff(creep, resource);
    } else
        this.cancelAction(creep);
    return workResult;
};
mod.loadNuker = function(creep) {
    let target = creep.target;
    let room = creep.room;
    let workResult = null;
    let resource = null;
    let amount = 0;
    // drop off at lab
    amount = target.getNeeds(RESOURCE_ENERGY);
    if (amount > 0 && (creep.carry.energy||0) > 0) {
        resource = RESOURCE_ENERGY;
    } else {
        amount = target.getNeeds(RESOURCE_GHODIUM);
        if (amount > 0 && (creep.carry[RESOURCE_GHODIUM]||0) > 0) {
            resource = RESOURCE_GHODIUM;
        }
    }
    amount = Math.min(amount,creep.carry[resource]||0);
    if (resource) workResult = this.loadStructure(creep, target, resource, amount);

    if ((creep.carry[resource]||0) > amount) {
        this.assignDropOff(creep, resource);
    } else {
        this.cancelAction(creep);
    }
    return workResult;
};
mod.work = function(creep) {
    let workResult = null;
    let room = creep.room;
    let target = creep.target;
    let storage = room.storage;
    let terminal = room.terminal;

    if (creep.sum === 0) {
        switch (target.structureType) {
            case STRUCTURE_LAB:
                workResult = this.unloadLab(creep);
                break;
            case STRUCTURE_POWER_SPAWN:
                // cannot unload a powerSpawn
                this.cancelAction(creep);
                break;
            case STRUCTURE_NUKER:
                // cannot unload a nuker
                this.cancelAction(creep);
                break;
            case STRUCTURE_CONTAINER:
                workResult = this.unloadContainer(creep);
                break;
            case STRUCTURE_TERMINAL:
                workResult = this.unloadTerminal(creep);
                break;
            case STRUCTURE_STORAGE:
                workResult = this.unloadStorage(creep);
                break;
            default:
                this.cancelAction(creep);
                break;
        }
    } else {
        switch (target.structureType) {
            case STRUCTURE_LAB:
                workResult = this.loadLab(creep);
                break;
            case STRUCTURE_POWER_SPAWN:
                workResult = this.loadPowerSpawn(creep);
                break;
            case STRUCTURE_NUKER:
                workResult = this.loadNuker(creep);
                break;
            case STRUCTURE_CONTAINER:
                workResult = this.loadContainer(creep);
                break;
            case STRUCTURE_TERMINAL:
                workResult = this.loadTerminal(creep);
                break;
            case STRUCTURE_STORAGE:
                workResult = this.loadStorage(creep);
                break;
            default:
                this.cancelAction(creep);
                break;
        }
    }

    // if (target.structureType === STRUCTURE_LAB) {
    //     let data = creep.room.memory.resources.reactions;
    //     let target;
    //     let workResult = null;
    //     if (data.amount > 0) {
    //         workResult = this.loadLab(creep);
    //     } else if (data.amount === 0) {
    //         // get labs
    //         let labs = creep.room.find(FIND_MY_STRUCTURES, {
    //             filter: (s) => {
    //                 return s.structureType === STRUCTURE_LAB && s.id !== target.id;
    //             },
    //         });
    //         // get target lab
    //         for (let i = 0; i < labs.length; i++) {
    //             let lab = labs[i];
    //             let data = creep.room.memory.resources.lab.find(s => s.id === lab.id);
    //             if (data && (data.reactionState === global.LAB_IDLE)) {
    //                 target = lab;
    //             }
    //             if (target && creep.carryCapacity - creep.sum > 0) {
    //                 creep.target = target;
    //                 workResult = this.unloadLab(creep);
    //                 return false
    //             } else if (target) {
    //                 Object.keys(creep.store).forEach(content => {
    //                     // TODO check this...
    //                     this.assignDropOff(creep, content);
    //                 });
    //                 return true;
    //             }
    //         }
    //
    //
    //     }
    //
    //     return workResult;
    // }


    return workResult;
};
