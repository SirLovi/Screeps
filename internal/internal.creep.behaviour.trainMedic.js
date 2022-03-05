const mod = new Creep.Behaviour('trainMedic');
module.exports = mod;
mod.run = function(creep) {
    const leadingCreep = Task.train.findLeading(creep);
    const leadingRoom = leadingCreep && leadingCreep.pos.roomName;
    if(leadingRoom==creep.room.name) this.nextAction(creep);
    if (!creep.action || creep.action.name === 'idle') {
        // Assign next Action
        this.nextAction(creep);
    }
    // Do some work
    if( creep.action && creep.target ) {
        creep.action.step(creep);
    } else {
        // Error overriden because no action is used during moveTo()
        // logError('Creep without action/activity!\nCreep: ' + creep.name + '\ndata: ' + JSON.stringify(creep.data));
    }
    this.heal(creep);
};

mod.nextAction = function(creep) {
    const rallyFlag = Game.flags[creep.data.destiny.targetName];
    if (!rallyFlag) {
            return this.assignAction(creep, 'recycling');
    } else if(!creep.data.destiny.boosted || (creep.data.destiny.boosted && !Creep.action.boosting.assign(creep))){
        const attackFlag = global.FlagDir.find(global.FLAG_COLOR.invade.attackTrain, creep.pos, false);
        global.Population.registerCreepFlag(creep, rallyFlag);
        // find the creep ahead of us in the train
        const leadingCreep = global.Task.train.findLeading(creep);
        const leadingRoom = leadingCreep && leadingCreep.pos.roomName;
        const attackRoom = attackFlag && attackFlag.pos.roomName;
        const rallyRoom = rallyFlag && rallyFlag.pos.roomName;
        if (!leadingCreep) {
                this.assignAction(creep, 'travelling', rallyFlag);
        }
        else if (creep.pos.getRangeTo(leadingCreep) >= 1) {
            creep.moveTo(leadingCreep);
        } else {
            this.assignAction(creep, 'idle');
        }
    }
};

mod.heal = function(creep){
    if( creep.data.body.heal !== undefined  ) {
        const mustHealSelf = creep.hits < creep.data.hullHits;
        if( mustHealSelf || creep.hits < creep.hitsMax ){
            // Heal self if not attacking or missing combat parts
            if( mustHealSelf || !creep.attacking ) {
                creep.heal(creep);
            }
        }
        // Heal other
        else if( creep.room.casualties.length > 0 ){
            let injured = creep.pos.findInRange(creep.room.casualties, 3);
            if( injured.length > 0 ){
                const target = creep.pos.findClosestByRange(injured);
                const canHeal = creep.pos.isNearTo(target) && !mustHealSelf;
                const shouldHeal = target.data && target.hits < target.hitsMax;
                // Heal other if not attacking or they are badly hurt
                if( canHeal && (shouldHeal || !creep.attacking) ) {
                    creep.heal(target);
                } else if( shouldHeal && !(creep.attackingRanged || creep.attacking || mustHealSelf)) {
                    creep.rangedHeal(target);
                }
            }
        }
    }
};
