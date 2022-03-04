const mod = new Creep.Behaviour('remoteMiner');
module.exports = mod;
const super_run = mod.run;
mod.run = function(creep) {
    let casualties = creep.room.casualties.length > 0;
    if (!Creep.action.avoiding.run(creep)) {
        let flag = creep.data.destiny ? Game.flags[creep.data.destiny.targetName] : null;
        if (!flag) {

            global.logSystem(creep.room.name, `${creep.name} no flag for remoteMiner`);


            if (!creep.action || creep.action.name !== 'recycling') {
                this.assignAction(creep, 'recycling');
            }
        } else if (creep.room.name !== creep.data.destiny.room) {
            Creep.action.travelling.assignRoom(creep, flag.pos.roomName);
        } else if (casualties) {
            Creep.behaviour.ranger.heal.call(this, creep);
        }
        super_run.call(this, creep);
    }
};
mod.actions = function(creep) {
    // return Creep.behaviour.miner.actions.call(this, creep);
    return [
        Creep.action.mining,
        Creep.action.healing,
        Creep.action.recycling,
    ];
}
mod.getEnergy = function(creep) {
    return Creep.behaviour.miner.getEnergy.call(this, creep);
};
mod.maintain = function(creep) {
    return Creep.behaviour.miner.maintain.call(this, creep);
};
mod.strategies.defaultStrategy.moveOptions = function(options) {
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
