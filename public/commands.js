// useful commands

// Removes all enemy structures in a set room
global.destroyAllHostileStructures('roomName');

// Pathfinds route from "START" flag to target room sources and places road(WHITE,WHITE) flags
global.runAutobahn('targetSourceRoom',['parsedroom','parsedroom','parsedroom']);

// Removes all flags of set color
global.removeFlagsByColor(COLOR_1, COLOR_2);

// Lists constructionSites currently present
global.listConstructionSites(filter);

// Removes all flags with primary COLOR_CYAN (construction flags)
global.removeConstructionFlags();

global.removeRoomConstructionFlags('roomName');

global.removeRoomWallRampartFlags('roomName');

global.removeRoomRoadFlags('roomName');

global.removeConstructionSites('roomName');

for(const roomName in Memory.tasks.mining) {delete Memory.tasks.mining[roomName];}

for(const roomName in Memory.rooms) {delete Memory.rooms[roomName].spawnQueueLow;delete Memory.rooms[roomName].spawnQueueMedium;delete Memory.rooms[roomName].spawnQueueHigh;}

_.forEach((Game.rooms["roomName"].find(FIND_CREEPS)), s => s.suicide());

_.forEach((Game.rooms["roomName"].find(FIND_STRUCTURES, {filter: (i) => i.structureType == STRUCTURE_WALL })), s => s.destroy());

global.Util.resetBoostProduction();

Game.rooms['roomName'].placeRoomOrder('orderId', RESOURCE_ENERGY, 50000);

// Recalculates ROUTE_ROOM_COST
delete Memory.routeRange;

// Recycle a creep
Creep.action.recycling.assign(Game.creeps['creepName']);

// flush road construction traces
_.forEach(Memory.rooms, r => delete r.roadConstructionTrace);

// remove all construction Sites
_.forEach(Game.constructionSites, s => s.remove());

// remove all road construction Sites
_.forEach(Game.constructionSites, s => s.structureType === STRUCTURE_ROAD ? s.remove() : null);

// spawn something...
Game.spawns['spawnName'].createCreepBySetup(Creep.setup.worker);
// or
Game.rooms['roomName'].spawnQueueLow.push({parts:[MOVE,WORK,CARRY],name:'max',setup:'worker'});
// or
global.Task.forceSpawn(Task.claim.creep.claimer, 'W0N0');
// or
global.Task.forceSpawn(Task.guard.creep.guard, {targetRoom: 'W0N0', allowTargetRoom: true}, 'Flag22');

// clear spawn queues for a room
// clear low priority queue
Memory.rooms['roomName'].spawnQueueLow = [];
// clear medium priority queue
Memory.rooms['roomName'].spawnQueueMedium = [];
// clear high priority queue
Memory.rooms['roomName'].spawnQueueHigh = [];

// check if a specific creep type is in queue
global.Util.inQueue('defender');
// or
global.Util.inQueue({behaviour: 'defender'});
// You can also limit by target room:
global.Util.inQueue({behaviour: 'remoteMiner', room: 'W0N0'});

// move Creep
Game.creeps['creepName'].move(RIGHT);

// force recycle a Creep
Game.creeps['creepName'].data.creepType="recycler";

// To override a module file create a copy of an existing module and name it "custom.originalModuleName". Then call this method (without ".js"):
getPath('originalModuleName', true);
// To completely re-evaluate all modules:
delete Memory.modules;

// Safely wipe all Memory except creep role memory
_.forEach(Memory, (v, k) => !['population'].includes(k) && delete Memory[k]);

// create market order (replace [roomName] with target room or remove it for subscription tokens)
Game.market.createOrder({type, resourceType, price, totalAmount, roomName});

//accept market sell or buy order
Game.market.deal(orderId, amount, roomName);

//flush visuals heatmap
_.forEach(Memory.rooms, r => delete r.heatmap);

// https://github.com/ScreepsOCS/screeps.behaviour-action-pattern/wiki/Resource-Management
//resource management  - stat labs
Game.rooms['roomName'].placeReactionOrder('labId', 'resourceId', 'amount');

//resource management - maintain set amount in container
Game.rooms['roomName'].setStore('structure', 'resource', 'amount');

//resource management - one off amount in container
Game.rooms['roomName'].placeOrder('structure', 'resource', 'amount');

// Order all labs to store 2000 energy
_.values(Game.structures).filter(i=>i.structureType==='lab').map(i=>i.room.setStore(i.id, RESOURCE_ENERGY, 2000));

// Examine the low priority spawn queue in all rooms
_.chain(Game.spawns).values().map(i=>i.room).unique().filter(i=>i.spawnQueueLow.length).map(i=>[`\n====${i.name}====>`,i.spawnQueueLow.map(j=>j.name)]).value();

// Show histogram of remoteHauler weight
JSON.stringify(_.chain(Game.creeps).filter(i=>i.data.creepType==='remoteHauler').groupBy('data.weight').mapValues(i=>i.length))

// Shift all defense flags to a single room
global.FlagDir.filter(FLAG_COLOR.defense).map(i=>Game.flags[i.name]).map(i=>i.setPosition(new RoomPosition(i.pos.x, i.pos.y, 'roomName')))
