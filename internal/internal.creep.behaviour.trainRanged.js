const mod = new Creep.Behaviour('trainRanged');
module.exports = mod;
mod.run = function(creep) {
    const leadingCreep = Task.train.findLeading(creep);
    // global.logSystem(creep.room.name, `leadingCreep: ${global.json(leadingCreep)}`);
    const leadingRoom = leadingCreep && leadingCreep.pos.roomName;
    // global.logSystem(creep.room.name, `leadingRoom: ${leadingRoom} rangedRoomName: ${creep.room.name}`);
    if(leadingRoom === creep.room.name) {
        this.nextAction(creep);
    }
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

    let hasRangedAttack = creep.hasActiveBodyparts(RANGED_ATTACK);
    if( hasRangedAttack ) {
        const targets = creep.pos.findInRange(creep.room.hostiles, 3);
        if(targets.length > 2) { // TODO: precalc damage dealt
            if(CHATTY)
                creep.say('MassAttack');
            creep.attackingRanged = creep.rangedMassAttack() === OK;
            return;
        } else {
            creep.attackingRanged = creep.rangedAttack(targets[0]) === OK;
        }
    }
};

mod.nextAction = function(creep) {
    const rallyFlag = Game.flags[creep.data.destiny.targetName];
    if (!rallyFlag) {
            return this.assignAction(creep, 'recycling');
    } else if(!creep.data.destiny.boosted || (creep.data.destiny.boosted && !Creep.action.boosting.assign(creep))){
        const attackFlag = global.FlagDir.find(global.FLAG_COLOR.invade.attackTrain, creep.pos, false);
        // global.logSystem(creep.room.name, `attackFlag: ${global.json(attackFlag)}`);
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
