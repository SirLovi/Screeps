const mod = new Creep.Behaviour('worker');
module.exports = mod;
mod.inflowActions = function (creep) {
    let priority = [
        Creep.action.bulldozing,
        Creep.action.picking,
        Creep.action.dismantling,
        Creep.action.withdrawing,
        Creep.action.uncharging,
        Creep.action.harvesting,
        Creep.action.reallocating
    ];
    if (creep.sum > creep.carry.energy) {
        priority.unshift(Creep.action.storing);
    }
    return priority;
};
mod.outflowActions = function (creep) {
    if (creep.room.situation.invasion && creep.room.controller && creep.room.controller.level > 2) {
        return [
            Creep.action.fueling,
            Creep.action.feeding,
            Creep.action.repairing
        ];
    } else if (creep.room.nuked) {

        //global.logSystem(creep.room.name, `workers know room is NUKED`);

        return [
            Creep.action.building,
            Creep.action.fortifying
        ];

    } else {

        let priority = [];

        if (creep.room.controller && creep.room.controller.level === 8)
            priority = [
                Creep.action.building,
                Creep.action.fortifying,
                Creep.action.repairing,
                Creep.action.storing,
                Creep.action.upgrading
            ];
        else
            priority = [
                Creep.action.building,
                Creep.action.fortifying,
                Creep.action.feeding,
                Creep.action.fueling,
                Creep.action.repairing,
                Creep.action.charging,
                Creep.action.storing,
                Creep.action.upgrading
            ];

        const needMinersOrHaulers = (room) => {
            const typeCount = room.population && room.population.typeCount;
            return !typeCount.hauler || typeCount.hauler < 1 || !typeCount.miner || typeCount.miner < 1;
        };
        if (creep.room.relativeEnergyAvailable < 1 && needMinersOrHaulers(creep.room)) {
            priority.unshift(Creep.action.feeding);
        }
        if (creep.room.controller && creep.room.controller.ticksToDowngrade < 2000) { // urgent upgrading
            priority.unshift(Creep.action.upgrading);
        }
        if (creep.sum > creep.carry.energy) {
            priority.unshift(Creep.action.storing);
        }
        priority.unshift(Creep.action.bulldozing);
        return priority;
    }
};
mod.nextAction = function (creep) {

    /*
    if (creep.ticksToLive > 1350 && creep.data && !creep.data.boosted) {
        //global.logSystem(creep.room.name, `workers go to boost`);

        let notBoostedParts = _.some(creep.body, bodyParts => {
            return bodyParts.type === 'work' && !bodyParts.boost;
        });

        if (!notBoostedParts)
            creep.data.boosted = true;

        let labs = creep.room.find(FIND_MY_STRUCTURES, {filter: (s)=> {
                return s.structureType === STRUCTURE_LAB && s.mineralType === 'XLH2O' &&
                    s.mineralAmount > LAB_BOOST_MINERAL && s.energy >= LAB_BOOST_ENERGY;
            }});
        if (labs.length === 0)
            labs = creep.room.find(FIND_MY_STRUCTURES, {filter: (s)=> {
                    return s.structureType === STRUCTURE_LAB && s.mineralType === 'LHO2' &&
                        s.mineralAmount > LAB_BOOST_MINERAL && s.energy >= LAB_BOOST_ENERGY;
                }});
        if (labs.length === 0)
            labs = creep.room.find(FIND_MY_STRUCTURES, {filter: (s)=> {
                    return s.structureType === STRUCTURE_LAB && s.mineralType === 'LH' &&
                        s.mineralAmount > LAB_BOOST_MINERAL && s.energy >= LAB_BOOST_ENERGY;
                }});

        if (labs.length > 0) {
            let lab = _.max(labs, 'mineralAmount');
            if (global.SAY_ASSIGNMENT) creep.say(String.fromCharCode(9883), global.SAY_PUBLIC);
            if (creep.pos.getRangeTo(lab) > 1)
                creep.moveTo(lab);
            else
                lab.boostCreep(creep);
            return;
        }


    }

     */
    if (creep.data.creepType === "worker" && creep.pos.roomName !== creep.data.homeRoom && Game.rooms[creep.data.homeRoom] && Game.rooms[creep.data.homeRoom].controller) {
        if (global.DEBUG && global.TRACE)
            global.trace('Behaviour', {actionName: 'travelling', behaviourName: this.name, creepName: creep.name, assigned: true, Behaviour: 'nextAction', Action: 'assign'});
        Creep.action.travelling.assignRoom(creep, creep.data.homeRoom);
        return true;
    }
    return this.nextEnergyAction(creep);
};
