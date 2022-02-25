const mod = new Creep.Behaviour('mineralMiner');
module.exports = mod;
mod.actions = function(creep) {
    return Creep.behaviour.miner.actions.call(this, creep);
};
mod.getEnergy = function(creep) {
    return Creep.behaviour.miner.getEnergy.call(this, creep);
};
mod.maintain = function(creep) {
    return Creep.behaviour.miner.maintain.call(this, creep);
};
mod.strategies.mining = {
    newTarget: function(creep) {
        const notOccupied = source => {
            if (!creep.data.determinatedTarget) {
                if (!Memory.rooms[creep.room.name].minerals)
                    creep.room.saveMinerals();
                creep.data.determinatedTarget = Memory.rooms[creep.room.name].minerals[0];
            }
            const hasThisSource = data => data.creepName !== creep.name && data.determinatedTarget === source.id;
            // const hasThisSource = data => data.creepName !== creep.name;
            let ret =  !_.find(Memory.population, hasThisSource);
            console.log(`HAS THIS SOURCE ${ret}`);
            return ret;
        };
        let ret = _.find(creep.room.minerals, notOccupied);
        // if (!ret && creep.data.lastTarget === creep.room.memory.minerals && Game.getObjectById(creep.room.memory.minerals) && Game.getObjectById(creep.room.memory.minerals).mineralAmount === 0)
        //     global.Task.reCycleOrIdle(creep);

        global.logSystem(creep.room.name, `${creep.name} TARGET: ${ret}`);

        return ret;
    },
};
