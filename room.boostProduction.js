"use strict";

let mod = {
    analyze() {
        this.boostProduction();
    },
    boostProduction() {

        if (!global.MAKE_COMPOUNDS)
            return;

        let roomTrading = Memory.boostTiming.roomTrading;

        if (roomTrading.boostAllocation || roomTrading.reallocating)
            return;

        // make compounds
        if (Game.time % global.MAKE_COMPOUNDS_INTERVAL === 0) {

            let myRooms = _.filter(Game.rooms, {'my': true}),
                orderingRoom = global.orderingRoom(),
                reactionPlacedRoom = _.some(myRooms, room => {
                    let data = room.memory.resources;
                    if (!data || !data.boostTiming)
                        return false;
                    return data.boostTiming.roomState === 'reactionPlaced'
                }),
                numberOfOrderingRooms = orderingRoom.length,
                roomFound = false;

            for (let room of myRooms) {

                let data = room.memory.resources;

                if (global.AUTO_REGISTER_LABS)
                    room.autoRegisterLabs();

                if (_.isUndefined(data) || _.isUndefined(data.reactions))
                    continue;

                let boostTiming = data.boostTiming,
                    checkOrdersPlacedRoom = false,
                    reactionMakingStarted = function () {
                        if (data.reactions.orders.length === 0)
                            return false;
                        let reactionCompound = data.reactions.orders[0].type,
                            storageLabs = _.filter(data.lab, lab => {
                                return lab.reactionState === 'Storage';
                            }).length,
                            workingLabs = _.filter(data.lab, lab => {
                                if (lab.id === data.reactions.seed_a || lab.id === data.reactions.seed_b || lab.reactionState === 'Storage')
                                    return false;
                                let labObject = Game.getObjectById(lab.id);
                                return labObject.mineralType === reactionCompound && labObject.mineralAmount >= LAB_REACTION_AMOUNT;
                            }).length;

                        return workingLabs === data.lab.length - 2 - storageLabs;
                    };


                // ordersPlaced => reactionMaking
                if (!data.orders)
                    data.orders = [];
                else if (data.orders.length === 0 || _.sum(data.orders, 'amount') <= 0) {

                    if (boostTiming.roomState === 'ordersPlaced') {
                        let reactionMaking = reactionMakingStarted();
                        if (reactionMaking) {
                            boostTiming.roomState = 'reactionMaking';
                            boostTiming.checkRoomAt = Game.time;
                            delete boostTiming.getOfferAttempts;
                            global.logSystem(room.name, `${room.name} orders done, reaction started`);
                        } else if (Object.keys(boostTiming).length > 2 || boostTiming.checkRoomAt < Game.time + global.CHECK_ORDERS_INTERVAL)
                            checkOrdersPlacedRoom = true;
                    }
                }
                // new line
                if (boostTiming && Game.time >= boostTiming.checkRoomAt && room.structures.labs.all.length !== room.structures.labs.storage.length - 2) {

                    // new line
                    //global.logSystem(room.name, `LABS - all: ${room.structures.labs.all.length}, storage: ${room.structures.labs.storage.length}`);

                    // reactionMakingRooms
                    if (data.boostTiming.roomState === 'reactionMaking') {

                        if (_.sum(data.reactions.orders, 'amount') > 0) {
                            boostTiming.reactionMaking = Game.time;
                            room.countCheckRoomAt();
                            global.logSystem(room.name, `${room.name} checkRoomAt counted: ${boostTiming.checkRoomAt - Game.time}`);
                        } else {
                            global.logSystem(room.name, `reactions done in ${room.name}`);
                            data.boostTiming = {};
                        }
                    } else if (_.isUndefined(data.reactions.orders))
                        data.boostTiming = {};
                }

                // log and fix next finishing reactions data
                if ((Game.time % 50 === 0 && data.reactions && data.reactions.reactorMode === 'burst' && data.boostTiming.roomState === 'reactionMaking' && boostTiming.checkRoomAt - Game.time <= 300)
                    || (Game.time % 50 === 0 && checkOrdersPlacedRoom)) {

                    checkOrdersPlacedRoom = false;

                    let reactionOrder = data.reactions.orders[0];

                    if (reactionOrder && reactionOrder.amount > 0) {

                        global.logSystem(room.name, `${room.name}, finishing ${reactionOrder.type}. checkRoomAt: ${boostTiming.checkRoomAt - Game.time}`);

                        let labA = Game.getObjectById(data.reactions.seed_a),
                            labB = Game.getObjectById(data.reactions.seed_b),
                            orderType = reactionOrder.type,
                            component_a = global.LAB_REACTIONS[orderType][0],
                            component_b = global.LAB_REACTIONS[orderType][1],
                            creepCarryA = room.resourcesCreeps[component_a] || 0,
                            creepCarryB = room.resourcesCreeps[component_b] || 0,
                            reactionAmount = reactionOrder.amount,
                            labOrderAmounts = room.getSeedLabOrders(),
                            labOrderAmountA = labOrderAmounts.labOrderAmountA,
                            labOrderAmountB = labOrderAmounts.labOrderAmountB,
                            resourcesA = room.resourcesAll[component_a],
                            resourcesB = room.resourcesAll[component_b],
                            labResourcesA = labA.mineralAmount + labOrderAmountA,
                            labResourcesB = labB.mineralAmount + labOrderAmountB;

                        global.logSystem(room.name, `reactionAmount ${reactionAmount}`);
                        global.logSystem(room.name, `labs stored: seed_a: ${labA.mineralAmount} ${component_a} seed_b: ${labB.mineralAmount} ${component_b}`);

                        global.logSystem(room.name, `labs ordered: seed_a: ${labOrderAmountA} ${component_a} seed_b: ${labOrderAmountB} ${component_b}`);

                        if (labResourcesA === reactionAmount && labResourcesB === reactionAmount) {
                            global.logSystem(room.name, `lab orders OK`);
                        } else if (reactionAmount > labResourcesA || reactionAmount > labResourcesB) {
                            global.logSystem(room.name, `NOT ENOUGH lab orders:`);
                            global.logSystem(room.name, `${room.name} reactionAmount: ${reactionAmount} DIFF: labA: ${labResourcesA - reactionAmount} labB: ${labResourcesB - reactionAmount}`);
                            let minAmount = Math.min(labResourcesA, labResourcesB);
                            if (minAmount >= LAB_REACTION_AMOUNT) {
                                reactionOrder.amount = minAmount;
                                boostTiming.reactionMaking = Game.time;
                                room.countCheckRoomAt();
                            } else {
                                reactionOrder.amount = 0;
                                boostTiming.checkRoomAt = Game.time;
                            }
                            global.logSystem(room.name, `reactionOrders fixed: ${reactionOrder.amount}`);
                        } else if (reactionAmount < labResourcesA || reactionAmount < labResourcesB) {
                            global.logSystem(room.name, `TOO MUCH lab orders:`);
                            global.logSystem(room.name, `${room.name} reactionAmount: ${reactionAmount} DIFF: labA: ${labResourcesA - reactionAmount} labB: ${labResourcesB - reactionAmount}`);
                            let minAmount = Math.min(labResourcesA, labResourcesB);
                            if (minAmount >= LAB_REACTION_AMOUNT) {
                                reactionOrder.amount = minAmount;
                                boostTiming.reactionMaking = Game.time;
                                room.countCheckRoomAt();
                            } else {
                                reactionOrder.amount = 0;
                                boostTiming.checkRoomAt = Game.time;
                            }
                            global.logSystem(room.name, `reactionOrders fixed: ${reactionOrder.amount}`);
                        }

                        if (reactionAmount > 0) {
                            if (((_.isUndefined(resourcesA) || resourcesA < 0) && labA.mineralAmount < LAB_REACTION_AMOUNT && creepCarryA === 0)
                                || ((_.isUndefined(resourcesB) || resourcesB < 0) && labB.mineralAmount < LAB_REACTION_AMOUNT && creepCarryB === 0)) {
                                reactionOrder.amount = 0;
                                delete room.memory.boostTiming;
                                global.logSystem(room.name, `resources NOT OK`);
                                global.logSystem(room.name, `resourcesA: ${resourcesA} resourcesB: ${resourcesB}`);
                                global.logSystem(room.name, `reactionOrders fixed: ${reactionOrder.amount}`);
                            }
                        }
                    }
                }

                // inactive rooms => try to make reactions
                // new line
                if (numberOfOrderingRooms === 0 && !reactionPlacedRoom && !roomFound && room.structures.labs.all.length !== room.structures.labs.storage.length - 2) {
                    roomFound = room.makeReaction();
                    //global.logSystem(room.name, `roomFound ${roomFound}`);
                }
            }
        }
    }
};

module.exports = mod;


