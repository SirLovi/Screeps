"use strict";

let mod = {};

mod.analyze = function () {
        mod.boostAllocation();
    };
mod.boostAllocation = function () {

    if (!global.ALLOCATE_COMPOUNDS)
        return;

    mod.writeAllocateParametersToMemory();

    let roomTrading = Memory.boostTiming.roomTrading;
    if (roomTrading.boostProduction)
        return;

    let myRooms = _.filter(Game.rooms, {'my': true}),
        roomFound,
        orderingRoom = global.orderingRoom(),
        numberOfOrderingRooms = orderingRoom.length,
        // TODO && global.MAKE_COMPOUNDS is necessary?
        timing = (!roomTrading.boostAllocation && Memory.boostTiming.timeStamp + 50 === Game.time && global.MAKE_COMPOUNDS)
            || Game.time % global.ALLOCATE_COMPOUNDS_INTERVAL === 0 || Memory.allocateProperties.urgentAllocate.allocate;

    if (timing) {

        console.log('start the allocating');

        for (let room of myRooms) {

            let data = room.memory.resources,
                labArray = [];

            if (_.isUndefined(data) || _.isUndefined(data.lab) || data.lab.length === 0) {
                console.log(`There is no room.memory.resources: skipping ${room.name}`);
                continue;
            }

            // for urgentAllocate
            if (Memory.allocateProperties.urgentAllocate) {
                if (Memory.allocateProperties.urgentAllocate.allocate) {
                    if (Memory.allocateProperties.urgentAllocate.allocateRooms.length === 0)
                        Memory.allocateProperties.urgentAllocate.allocate = false;
                    else if (Memory.allocateProperties.urgentAllocate.allocateRooms.indexOf(room.name) === -1)
                        continue;
                    else
                        Memory.allocateProperties.urgentAllocate.allocateRooms = _.filter(Memory.allocateProperties.urgentAllocate.allocateRooms, currentRoom => {
                            return currentRoom !== room.name;
                        });
                }
            }

            console.log(`${room.name}`);

            Object.keys(Memory.compoundsToAllocate).forEach(compound => {

                let compoundObject = Memory.compoundsToAllocate[compound],
                    roomEnabled = compoundObject.allocateRooms.indexOf(room.name) > -1 || compoundObject.allocateRooms.length === 0,
                    storageLab = function (room, compound) {

                        // lab order placed?
                        let returnValue = _.filter(data.lab, labs => {
                            return (labs.reactionState === 'Storage' && _.some(labs.orders, order => {
                                return order.type === compound || (labs.orders.length === 1 && order.type === 'energy');
                            }));
                        });

                        if (returnValue.length === 0)
                            return false;
                        else if (returnValue.length === 1)
                            return returnValue[0];
                        else
                            console.log(`WARNING  ${room.name} has ${returnValue.length} registered lab to STORE ${compound}`);

                    },
                    unregisterBoostLab = function (room, compound) {

                        // find and unregister not needed boostLabs
                        let storageLabExist = storageLab(room, compound);
                        if (storageLabExist) {
                            global.logSystem(room.name, `unregistering LAB ${storageLabExist.id} ${compound}`);
                            room.unRegisterBoostLab(storageLabExist.id);
                        }

                    },
                    superiorAllocated = false;

                if (compoundObject.allocate && roomEnabled) {

                    let storageLabExist = storageLab(room, compound),
                        numberOfLabs = room.structures.labs.all,
                        superiorStorageLabExist = compoundObject.superior ? storageLab(room, compoundObject.superior) : false,
                        allRoomResources = function (compound, currentRoom) {
                            let returnValue = 0;
                            for (let room of myRooms) {

                                if (currentRoom === room || _.isUndefined(room.terminal) || _.isUndefined(room.storage))
                                    continue;

                                if (!_.isUndefined(Memory.compoundsToAllocate[compound])) {

                                    let resourcesAll = room.resourcesAll[compound] || 0,
                                        reservedAmount = Memory.compoundsToAllocate[compound].amount + Memory.compoundsToAllocate[compound].roomThreshold,
                                        amountToTrade = resourcesAll - reservedAmount;

                                    if (Memory.allocateProperties.urgentAllocate.allocate && resourcesAll >= global.MIN_OFFER_AMOUNT)
                                        return resourcesAll;
                                    else if (amountToTrade >= global.MIN_OFFER_AMOUNT)
                                        returnValue += amountToTrade;
                                }
                            }
                            return returnValue;

                        },
                        empireResources = allRoomResources(compound, room),
                        roomOrderNeeded = (room.resourcesAll[compound] || 0) + (room.resourcesOrders[compound] || 0) < compoundObject.roomThreshold,
                        roomOrderGranted = empireResources >= compoundObject.amount;

                    if (compoundObject.superior) {
                        let superiorLabExist = storageLab(room, compoundObject.superior);
                        if (superiorLabExist)
                            superiorAllocated = true;
                    }

                    switch (compoundObject.storeTo) {

                        case 'lab':

                            let determineSeed = function (seed) {

                                    if (numberOfLabs <= 3 && numberOfLabs > 0 && !global.MAKE_REACTIONS_WITH_3LABS) {

                                        if (data.reactions && data.reactions.orders.length > 0 && !global.MAKE_REACTIONS_WITH_3LABS) {
                                            console.log(`There are only 3 labs in ${room.name} reaction for ${data.reactions.orders[0].type} is deleted`);
                                            delete room.memory.resources.reactions;
                                        }
                                        return 0;

                                    } else {
                                        superiorMaking = data.reactions.orders.length > 0 ? compoundObject.superior ? compoundObject.superior === data.reactions.orders[0].type && seedLabsLength >= 4 : compound === data.reactions.orders[0].type && seedLabsLength >= 4 : false;
                                        return seed;
                                    }
                                },
                                superiorMaking = false,
                                seedA = 0,
                                seedB = 0,
                                orderAmount = compoundObject.amount + compoundObject.labRefilledAt,
                                seedLabsLength = room.structures.labs.all - room.structures.labs.storage - 2,
                                storageLabId,
                                storageLab;

                            if (data.reactions) {
                                seedA = determineSeed(data.reactions.seed_a);
                                seedB = determineSeed(data.reactions.seed_b);
                            }

                            if (!storageLabExist && !superiorAllocated && !superiorMaking) {

                                let labArrayData = _.filter(data.lab, lab => {

                                    let changeLab = _.some(lab.orders, order => {
                                        if (Memory.compoundsToAllocate[order.type])
                                            return !Memory.compoundsToAllocate[order.type].allocate;
                                    });

                                    if (numberOfLabs <= 3 && numberOfLabs > 0 && !global.MAKE_REACTIONS_WITH_3LABS)
                                        return lab.reactionState !== 'Storage' || (changeLab && lab.reactionState === 'Storage');
                                    else
                                        return lab.id !== seedA && lab.id !== seedB && lab.reactionState !== 'Storage' || (changeLab && lab.id !== seedA && lab.id !== seedB && lab.reactionState === 'Storage');

                                });

                                if (labArrayData.length > 0) {
                                    for (let item of labArrayData) {
                                        labArray.push(Game.getObjectById(item.id));
                                    }
                                } else
                                    console.log(`${room.name} ha no candidates`);

                                if (labArray.length > 1) {
                                    storageLab = room.controller.pos.findClosestByPath(labArray);
                                    if (storageLab === null)
                                        storageLab = room.controller.pos.findClosestByRange(labArray);
                                    if (storageLab === null)
                                        storageLab = labArray[0];

                                    global.logSystem(room.name, `found lab in ${room.name} for ${compound} labId: ${storageLab.id}`);

                                } else if (labArray.length === 1)
                                    storageLab = labArray[0];

                            } else if (storageLabExist) {
                                global.logSystem(room.name, `Lab ${storageLabExist.id} is already registered in ${room.name} for ${compound}`);
                                storageLab = Game.getObjectById(storageLabExist.id);
                            } else if (superiorMaking) {
                                // find and unregister not needed boostLabs
                                if (superiorStorageLabExist) {
                                    global.logSystem(room.name, `${compoundObject.superior} is in progress, unregistering LAB ${superiorStorageLabExist.id} ${compoundObject.superior}`);
                                    room.unRegisterBoostLab(superiorStorageLabExist.id);
                                }
                            }

                            if (storageLab !== null && storageLab !== undefined) {

                                //global.logSystem(room.name, `${room.name} ${storageLab.id} ${storageLab.mineralAmount} ${storageLab.mineralType}`);

                                storageLabId = storageLab.id;

                                let labObject = data.lab.find(labs => labs.id === storageLabId),
                                    labIndex = data.lab.indexOf(labObject),
                                    currentOrder = labObject.orders.find(order => order.type === compound),
                                    labOrders = labObject.orders.find(order => order.type !== compound),
                                    energyOrders = labObject.orders.find(order => order.type === 'energy'),
                                    labOrderNeeded = (currentOrder && currentOrder.orderRemaining <= compoundObject.labRefilledAt && storageLab.mineralAmount <= compoundObject.labRefilledAt) || _.isUndefined(currentOrder),
                                    roomResources = room.resourcesAll[compound] || 0,
                                    labOrderGranted = roomResources >= global.UNREGISTER_BOOSTLAB_AT,
                                    labStoreAmount = Math.min(LAB_MINERAL_CAPACITY, orderAmount);

                                if (!storageLabExist && labOrderGranted && !superiorAllocated && !superiorMaking) {
                                    global.logSystem(room.name, `registering boostLab in ${room.name}, id: ${storageLabId} for ${compound}`);
                                    room.registerBoostLab(storageLabId);
                                } else if (!storageLabExist && !labOrderGranted) {
                                    global.logSystem(room.name, `registering boostLab in ${room.name}, is delayed. There are only ${roomResources} ${compound}`);
                                } else if (!storageLabExist && (superiorAllocated || superiorMaking)) {
                                    console.log(`registering canceled, ${compoundObject.superior} allocated in ${room.name} or superior making/allocated`);
                                } else if ((!_.isUndefined(currentOrder) && currentOrder.orderRemaining === 0 && storageLab.mineralAmount < global.UNREGISTER_BOOSTLAB_AT && !roomOrderGranted && !labOrderGranted)
                                    || superiorAllocated || superiorMaking) {
                                    // TODO if superior just exist and not allocated, allocate it in this turn
                                    if (!roomOrderGranted && !labOrderGranted)
                                        global.logSystem(room.name, `orderGranted: ${labOrderGranted} unRegistering boostLab in ${room.name}, id: ${storageLabId} for ${compound}`);
                                    else if (superiorAllocated || superiorMaking)
                                        global.logSystem(room.name, `superior ${compoundObject.superior ? compoundObject.superior : compound} allocated / making. unRegistering boostLab in ${room.name}, id: ${storageLabId} for ${compound}`);
                                    room.unRegisterBoostLab(storageLabId);
                                }

                                if (roomOrderNeeded && roomOrderGranted && !superiorAllocated && !superiorMaking && numberOfOrderingRooms === 0) {
                                    if (_.isUndefined(roomFound) && (!room.nuked || (room.nuked && compound === 'XLH2O'))) {
                                        global.logSystem(room.name, `${room.name} placeRoomOrder to room ${room.name}, ${orderAmount} ${compound}`);
                                        room.placeRoomOrder(storageLabId, compound, orderAmount);
                                        roomFound = room;
                                    } else {
                                        global.logSystem(room.name, `${room.name} placeRoomOrder to room ${room.name} is delayed, ${orderAmount} ${compound}, there was already a room order in this round`);
                                    }

                                } else if (!roomOrderGranted && roomOrderNeeded && !superiorAllocated && !superiorMaking)
                                    global.logSystem(room.name, `there are not enough resources to roomOrder a lab in ${room.name} empireResources: ${empireResources} ${compound}`);

                                if (labOrderNeeded && labOrderGranted && !superiorAllocated && !superiorMaking) {

                                    room.memory.resources.lab[labIndex].orders = [];
                                    room.memory.resources.lab[labIndex].orders.push(energyOrders);

                                    global.logSystem(room.name, `storageLab.mineralAmount: ${storageLab.mineralAmount} compoundObject.labRefilledAt: ${compoundObject.labRefilledAt}`);

                                    if (labStoreAmount > roomResources)
                                        labStoreAmount = roomResources;

                                    global.logSystem(room.name, `${room.name} placeOrder to registered LAB ${storageLab.id}, ${labStoreAmount} ${compound}`);

                                    room.placeOrder(storageLabId, compound, labStoreAmount);

                                } else if (storageLab.mineralType !== compound && storageLab.mineralType !== null && labOrderGranted && !superiorAllocated && !superiorMaking) {

                                    // delete the old older
                                    room.memory.resources.lab[labIndex].orders = [];
                                    room.memory.resources.lab[labIndex].orders.push(labOrders);

                                    if (labStoreAmount > roomResources)
                                        labStoreAmount = roomResources;

                                    global.logSystem(room.name, `labOrders in for ${storageLab.mineralType} in ${room.name} is deleted`);
                                    global.logSystem(room.name, `${room.name} placeOrder to LAB ${storageLab.id}, ${labStoreAmount} ${compound}`);
                                    room.placeOrder(storageLabId, compound, labStoreAmount);

                                } else if (!currentOrder && labOrderGranted && !superiorAllocated && !superiorMaking) {

                                    if (labStoreAmount > roomResources)
                                        labStoreAmount = roomResources;

                                    console.log(`${room.name} placeOrder to LAB (there is no order) ${storageLab.id}, ${labStoreAmount} ${compound}`);
                                    if (data.lab.length === 3 && data.reactions.orders.length > 0) {
                                        //delete reactions
                                        global.logSystem(room.name, `reactions deleted in ${room.name} there are only 3 labs`);
                                        room.memory.resources.reactions.orders = [];
                                    }
                                    room.placeOrder(storageLabId, compound, labStoreAmount);
                                }
                            } else if (!superiorMaking && !superiorAllocated)
                                global.logSystem(room.name, `${room.name} NO storage lab candidates found for ${compound}`);
                            else if (superiorMaking && !superiorAllocated && compoundObject.superior)
                                global.logSystem(room.name, `${room.name} already making ${compoundObject.superior}, ${compound} allocating is not necessary`);
                            else if (!superiorMaking && superiorAllocated && compoundObject.superior)
                                global.logSystem(room.name, `${room.name} ${compoundObject.superior} already allocated, ${compound} allocating is not necessary`);


                            break;

                        case 'storage':
                            // find and unregister not needed boostLabs
                            unregisterBoostLab(room, compound);

                            if (compound === 'power') {
                                if (_.isUndefined(room.structures.powerSpawn)) {
                                    global.logSystem(room.name, `There is no powerSpawn in ${room.name} ${compound} in not distributed`);
                                    //break;
                                }
                            } else if (roomOrderNeeded && roomOrderGranted && numberOfOrderingRooms === 0) {

                                if (_.isUndefined(roomFound) && (!room.nuked || (room.nuked && compound === 'XLH2O'))) {
                                    global.logSystem(room.name, `${room.name} placeOrder to STORAGE ${room.storage.id}, ${compoundObject.amount} ${compound}`);
                                    room.placeRoomOrder(room.storage.id, compound, compoundObject.amount);
                                    room.placeOrder(room.storage.id, compound, compoundObject.amount);
                                    roomFound = room;
                                } else if (!room.nuked && roomFound)
                                    global.logSystem(room.name, `${room.name} placeOrder to STORAGE is delayed, ${room.storage.id}, ${compoundObject.amount} ${compound} there was already a room order in this round`);
                                else if (room.nuked)
                                    global.logSystem(room.name, `${room.name} NUKED`);
                            }
                            break;
                    }
                } else {
                    // find and unregister not needed boostLabs
                    unregisterBoostLab(room, compound);
                }

            });
        }
        if (roomFound) {
            Memory.boostTiming.roomTrading.boostAllocation = true;
            Memory.boostTiming.timeStamp = Game.time;
            roomFound.GCOrders();
        }
    }
};
mod.writeAllocateParametersToMemory = function () {

    if (_.isUndefined(Memory.compoundsToAllocate)) {
        console.log(`Writing compoundsToAllocate to Memory`);
        Memory.compoundsToAllocate = global.COMPOUNDS_TO_ALLOCATE;
    }

    if (_.isUndefined(Memory.allocateProperties)) {
        console.log(`Initializing allocateProperties`);
        Memory.allocateProperties = {
            urgentAllocate : {
                allocate: false,
                allocateRooms: []

            },
            lastAllocated : {}
        };
    }


};

module.exports = mod;
