let mod = {};
module.exports = mod;
mod.name = 'portal';
mod.register = () => {};

mod.register = function(){
    Task.portal.handleIncomingCreep();
    Task.portal.handleOutgoingCreep();
};

mod.handleIncomingCreep = function(){
    let interShardData = RawMemory.interShardSegment && JSON.parse(RawMemory.interShardSegment);
    if(interShardData){
        if(interShardData.creeps){
            for(let index in interShardData.creeps){
                const creep = interShardData.creeps[index];
                //Creep has arrived
                if(Game.creeps[index] && creep.data.flagMem.destination.shard == Game.shard.name){
                    if(!interShardData.lock || interShardData.lock == Game.shard.name){
                        interShardData.lock = Game.shard.name;
                        RawMemory.interShardSegment = JSON.stringify(interShardData);
                        Game.creeps[index].memory = creep.memory;
                        Game.creeps[index].data = creep.data;
                        Memory.population[index] = creep.populationEntry;
                        delete interShardData.creeps[index];
                        delete interShardData.lock;
                        RawMemory.interShardSegment = JSON.stringify(interShardData);
                    }
                }
            }
        }
    }
};

mod.handleOutgoingCreep = function(){
    let interShardData = RawMemory.interShardSegment && JSON.parse(RawMemory.interShardSegment);
    if(!interShardData) interShardData = {};
    if(Memory.portalQueue){
        for(let hash in Memory.portalQueue){
            let creep = Game.creeps[hash];
            if(!creep) {
                delete Memory.portalQueue[hash];
                continue;
            }
            let data = {memory:creep.memory, data:creep.data};
            data.data.flagMem=creep.target.memory;
            delete data.data.flagName;
            data.populationEntry=Memory.population[creep.name];
            if(!interShardData.lock || interShardData.lock == Game.shard.name){
                interShardData.lock = Game.shard.name;
                RawMemory.interShardSegment = JSON.stringify(interShardData);
                if(interShardData.creeps){
                    interShardData.creeps[creep.name]=data;
                } else {
                    interShardData.creeps={};
                    interShardData.creeps[creep.name]=data;
                }
                delete interShardData.lock;
                delete Memory.portalQueue[hash];
                RawMemory.interShardSegment = JSON.stringify(interShardData);
            }
        }
    }
};


