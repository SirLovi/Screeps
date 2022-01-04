const action = new Creep.Action('portal');
action.reachedRange=0;
module.exports = action;

action.isValidAction = function(creep) {
    return true;
};

action.isValidTarget = function(target) {
    return target;
};

action.newTarget = function(creep) {
    const flag = this.targetFlag(creep);
    if(!flag) return false; 
    return flag;
};

action.targetFlag = function(creep) {
    return FlagDir.find(FLAG_COLOR.claim.portal, creep.pos, false);
};

action.work = function(creep) {
    //Overrode step instead to have more control over what happens.
};

action.step = function(creep){
    let targetFlag = this.targetFlag(creep);
    let flagMem = (creep.data.flagMem && creep.data.flagMem.destination) || (targetFlag.memory && targetFlag.memory.destination);
    let targetRoom = Game.rooms[targetFlag.pos.roomName];
    if(targetRoom && creep.room == targetRoom){
        let portal = _.filter(targetFlag.pos.lookFor(LOOK_STRUCTURES), {'structureType':STRUCTURE_PORTAL});
        if(!flagMem && portal[0] && portal[0].destination) {
            targetFlag.memory.destination = portal[0].destination;
        }
        if(portal[0] && portal[0].destination.shard){
            if(Memory.portalQueue){
                Memory.portalQueue[creep.name]={}
            } else {
                Memory.portalQueue={};
                Memory.portalQueue[creep.name]={};
            }
        }
        creep.travelTo(creep.target, {range: this.reachedRange});
    } else {
        if(flagMem){
            let destination = flagMem.roomName;
            if(destination == null) destination = flagMem.room;
            if(creep.room.name == destination) {
                //Arrived at destination - need to move away from portal if necessary
                let portal = _.filter(creep.pos.lookFor(LOOK_STRUCTURES), {'structureType':STRUCTURE_PORTAL});
                if(portal){
                    let positions = [
                        {x:creep.pos.x+1, y:creep.pos.y},
                        {x:creep.pos.x, y:creep.pos.y+1},
                        {x:creep.pos.x+1, y:creep.pos.y+1},
                        {x:creep.pos.x-1, y:creep.pos.y},
                        {x:creep.pos.x, y:creep.pos.y-1},
                        {x:creep.pos.x-1, y:creep.pos.y-1},
                        {x:creep.pos.x-1, y:creep.pos.y+1},
                        {x:creep.pos.x+1, y:creep.pos.y-1}
                    ];
                    for(let index in positions){
                        if(positions[index].x>=0 && positions[index].y<50){
                            let position = new RoomPosition(positions[index].x, positions[index].y, creep.room.name);
                            const objects = _.some(position.look(), function(x){return x.type!='terrain'});
                            if(!objects) {
                                creep.move(creep.pos.getDirectionTo(position));
                                break;
                            }
                        }
                    }
                }
                this.unassign();
            } else {
                creep.travelTo(creep.target, {range:this.reachedRange});
            }
        } else {
            creep.travelTo(creep.target, {range: this.reachedRange});
        }
    }
};
