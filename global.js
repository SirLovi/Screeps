const reduceMemoryWhere = function (result, value, key) {
    const setting = Memory.debugTrace[key];
    if (!Memory.debugTrace.hasOwnProperty(key)) {
        return result;
    } else if (result) { // default result
        // matches or for falsey values matches printed value
        return setting === value || (!value && setting === `${value}`);
    } else {
        return false;
    }
};
const noMemoryWhere = function (e) {
    const setting = Memory.debugTrace.no[e[0]];
    return setting === true || Memory.debugTrace.no.hasOwnProperty(e[0]) &&
        (setting === e[1] || (!e[1] && setting === `${e[1]}`));
};

let mod = {};
module.exports = mod;
// base class for events
mod.LiteEvent = function () {
    // registered subscribers
    this.handlers = [];
    // register a new subscriber
    this.on = function (handler) {
        this.handlers.push(handler);
    };
    // remove a registered subscriber
    this.off = function (handler) {
        this.handlers = this.handlers.filter(h => h !== handler);
    };
    // call all registered subscribers
    this.trigger = function (data) {
        try {
            this.handlers.slice(0).forEach(h => h(data));
        } catch (e) {
            global.logError('Error in LiteEvent.trigger: ' + (e.stack || e));
        }
    }
};
// Flag colors, used throughout the code
//COLOR_RED
mod.FLAG_COLOR = {
    invade: { // destroy everything enemy in the room
        color: COLOR_RED,
        secondaryColor: COLOR_RED,
        exploit: { // send privateers to exploit sources
            color: COLOR_RED,
            secondaryColor: COLOR_GREEN
        },
        robbing: { // take energy from foreign structures
            color: COLOR_RED,
            secondaryColor: COLOR_YELLOW
        },
        attackController: { // attack enemy controller and then claim
            color: COLOR_RED,
            secondaryColor: COLOR_CYAN
        }
    },
    //COLOR_PURPLE - Reserved labs
    labs: { // could be used to define certain lab commands
        color: COLOR_PURPLE,
        secondaryColor: COLOR_PURPLE,
        filter: {'color': COLOR_PURPLE, 'secondaryColor': COLOR_PURPLE },
        labTech: { // spawn lab tech when required
            color: COLOR_PURPLE,
            secondaryColor: COLOR_WHITE,
            filter: {'color': COLOR_PURPLE, 'secondaryColor': COLOR_WHITE }
        }

    },
    //COLOR_BLUE - Reserved (internal use)
    //COLOR_CYAN - Reserved (build related)
    construct: { // construct an extension at flag when available
        color: COLOR_CYAN,
        secondaryColor: COLOR_CYAN,
        spawn: { // construct a spawn at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_RED
        },
        tower: { // construct a tower at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_PURPLE
        },
        link: { // construct a link at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_BLUE
        },
        lab: { // construct a lab at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_GREEN
        },
        storage: { // construct a storage at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_YELLOW
        },
        terminal: { // construct a terminal at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_ORANGE
        },
        observer: { // construct an observer at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_BROWN
        },
        nuker: { // construct a nuker at flag when available
            color: COLOR_CYAN,
            secondaryColor: COLOR_GREY
        },
        powerSpawn: { // construct a power spawn at flagwhen available
            color: COLOR_CYAN,
            secondaryColor: COLOR_WHITE
        }
    },
    //COLOR_GREEN
    claim: { // claim this room, then build spawn at flag
        color: COLOR_GREEN,
        secondaryColor: COLOR_GREEN,
        spawn: { // send pioneers & build spawn here
            color: COLOR_GREEN,
            secondaryColor: COLOR_WHITE
        },
        pioneer: { // send additional pioneers
            color: COLOR_GREEN,
            secondaryColor: COLOR_RED
        },
        pioneerSmall: { // send additional pioneers
            color: COLOR_GREEN,
            secondaryColor: COLOR_CYAN
        },
        reserve: { // reserve this room
            color: COLOR_GREEN,
            secondaryColor: COLOR_GREY
        },
        mining: {
            color: COLOR_GREEN,
            secondaryColor: COLOR_BROWN
        },
        delivery: { // rob energy from friendly rooms and deliver here
            color: COLOR_GREEN,
            secondaryColor: COLOR_YELLOW
        }
    },
    //COLOR_YELLOW
    defense: { // point to gather troops
        color: COLOR_YELLOW,
        secondaryColor: COLOR_YELLOW
    },
    //COLOR_ORANGE
    destroy: { // destroy whats standing here
        color: COLOR_ORANGE,
        secondaryColor: COLOR_ORANGE,
        dismantle: {
            color: COLOR_ORANGE,
            secondaryColor: COLOR_YELLOW
        }
    },
    //COLOR_BROWN
    pavementArt: {
        color: COLOR_BROWN,
        secondaryColor: COLOR_BROWN
    },
    rampart: {
        color: COLOR_BROWN,
        secondaryColor: COLOR_BROWN
    },
    // COLOR_GREY
    // COLOR_WHITE
    command: { // command api
        color: COLOR_WHITE,
        drop: { // haulers drop energy in a pile here
            color: COLOR_WHITE,
            secondaryColor: COLOR_YELLOW
        },
        _OCS: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_PURPLE
        },
        roomLayout: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_CYAN
        },
        invalidPosition: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_RED
        },
        skipRoom: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_GREEN
        },
        idle: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_BROWN
        },
        road: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_WHITE
        },
        wall: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_GREY
        },
        safeGen: {
            color: COLOR_WHITE,
            secondaryColor: COLOR_BLUE
        }
    }
};
mod.DECAY_AMOUNT = {
    'rampart': RAMPART_DECAY_AMOUNT, // 300
    'road': ROAD_DECAY_AMOUNT, // 100
    'container': CONTAINER_DECAY // 5000
};
mod.DECAYABLES = [
    STRUCTURE_ROAD,
    STRUCTURE_CONTAINER,
    STRUCTURE_RAMPART
];
mod.LAB_IDLE = 'idle';
mod.LAB_BOOST = 'boost';
mod.LAB_SEED = 'seed';
mod.LAB_MASTER = 'master';
mod.LAB_SLAVE_1 = 'slave_1';
mod.LAB_SLAVE_2 = 'slave_2';
mod.LAB_SLAVE_3 = 'slave_3';
mod.REACTOR_TYPE_FLOWER = 'flower';
mod.REACTOR_MODE_IDLE = 'idle';
mod.REACTOR_MODE_BURST = 'burst';
mod.LAB_REACTIONS = {};
for (let a in REACTIONS) {
    for (let b in REACTIONS[a]) {
        mod.LAB_REACTIONS[REACTIONS[a][b]] = [a, b];
    }
}
mod.MEM_SEGMENTS = {
    COSTMATRIX_CACHE: {
        start: 98,
        end: 90
    }
};
// used to log something meaningful instead of numbers
mod.translateErrorCode = function (code) {
    let codes = {
        0: 'OK',
        1: 'ERR_NOT_OWNER',
        2: 'ERR_NO_PATH',
        3: 'ERR_NAME_EXISTS',
        4: 'ERR_BUSY',
        5: 'ERR_NOT_FOUND',
        6: 'ERR_NOT_ENOUGH_RESOURCES',
        7: 'ERR_INVALID_TARGET',
        8: 'ERR_FULL',
        9: 'ERR_NOT_IN_RANGE',
        10: 'ERR_INVALID_ARGS',
        11: 'ERR_TIRED',
        12: 'ERR_NO_BODYPART',
        14: 'ERR_RCL_NOT_ENOUGH',
        15: 'ERR_GCL_NOT_ENOUGH'
    };
    return codes[code * -1];
};
// manipulate log output
// simply put a color as "style"
// or an object, containing any css
mod.dye = function (style, text) {
    if (isObj(style)) {
        let css = "";
        let format = key => css += key + ":" + style[key] + ";";
        _.forEach(Object.keys(style), format);
        return ('<font style="' + css + '">' + text + '</font>');
    }
    if (style)
        return ('<font style="color:' + style + '">' + text + '</font>');
    else return text;
};
// predefined log colors
mod.CRAYON = {
    death: {color: 'black', 'font-weight': 'bold'},
    birth: '#e6de99',
    error: '#e79da7',
    system: {color: '#999', 'font-size': '10px'}
};
mod.destroyAllHostileStructures = function (roomName) {
        let room = Game.rooms[roomName];
        if (!room)
            return `${roomName} is undefined! (No vision?)`;
        if (!room.my)
            return `${roomName} is not owned by you!`;
        let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES/*, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_TERMINAL);
            }
        }*/);
        for (let structure of hostileStructures) {
            structure.destroy();
        }
        return `Destroyed ${hostileStructures.length} hostile structures.`;
    };
mod.removeFlagsByColor = function (color$$1, secondaryColor) {
    let removeFlags = _.filter(Game.flags, flag => flag.color == color$$1 && flag.secondaryColor == secondaryColor);
    for (let flag of removeFlags) {
        flag.remove();
    }
    return `Removed ${removeFlags.length} flags.`;
};
mod.removeConstructionFlags = function () {
    let removeFlags = _.filter(Game.flags, flag => flag.color == COLOR_CYAN);
    for (let flag of removeFlags) {
        flag.remove();
    }
    return `Removed ${removeFlags.length} construction flags.`;
};
mod.runAutobahn = function(roomName, roomsParsed) {
        
        autobahn = Autobahn;
        
        // Use a flag as the start point
        let start = Game.flags['START'];

        // Create an array of energy sources to use as the destinations
        let destinations = Game.rooms[roomName].find(FIND_SOURCES);
        
        // Allow autobahn to path in these three rooms
        //let options = {roomFilter: (roomName) => roomName.startsWith('W34')};
        let options = {roomFilter: roomsParsed};

        // Run autobahn
        let network = autobahn(start, destinations, options);

        // Build the road network
        for (let i = 0; i < network.length; i++) {
	        let pos = network[i];
	        //Game.rooms[pos.roomName].createConstructionSite(pos, STRUCTURE_ROAD);
	        if((pos.lookFor(LOOK_FLAGS).length == 0) && (pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0) && (pos.lookFor(LOOK_STRUCTURES).length == 0)){
			    pos.newFlag(FLAG_COLOR.command.road);
	        }
        }
};
mod.runAutobahnFlagEnd = function() {
        
        autobahn = Autobahn;
        
        // Use a flag as the start point
        let start = Game.flags['START'];

        // Create an array of energy sources to use as the destinations
        let destinations = [Game.flags['END']];
        
        // Allow autobahn to path in these three rooms
        //let options = {roomFilter: (roomName) => roomName.startsWith('W34')};
        let options = {roomFilter: ['W59N39', 'W58N39']};

        // Run autobahn
        let network = autobahn(start, destinations, options);

        // Build the road network
        for (let i = 0; i < network.length; i++) {
	        let pos = network[i];
	        //Game.rooms[pos.roomName].createConstructionSite(pos, STRUCTURE_ROAD);
	        if((pos.lookFor(LOOK_FLAGS).length == 0) && (pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0) && (pos.lookFor(LOOK_STRUCTURES).length == 0)){
			    pos.newFlag(FLAG_COLOR.command.road);
	        }
        }
};
mod.removeRoomRoadFlags = function (roomName) {
    let room = Game.rooms[roomName];
    let removeFlags = _.filter(room.find(FIND_FLAGS), flag => flag.color == COLOR_WHITE || flag.secondaryColor == COLOR_WHITE);
    for (let flag of removeFlags) {
        flag.remove();
    }
    return `Removed ${removeFlags.length} road flags.`;
};
mod.removeRoomConstructionFlags = function (roomName) {
    let room = Game.rooms[roomName];
    let removeFlags = _.filter(room.find(FIND_FLAGS), flag => flag.color == COLOR_CYAN || flag.color == COLOR_WHITE);
    for (let flag of removeFlags) {
        flag.remove();
    }
    return `Removed ${removeFlags.length} construction flags.`;
};
mod.listConstructionSites = function (filter) {
    let msg = `${_.keys(Game.constructionSites).length} construction sites currently present: `;
    for (let id in Game.constructionSites) {
        let site = Game.constructionSites[id];
        if (!filter || filter(site)) {
            msg += `\n>Type: ${site.structureType}` +
                `\n   Pos: ${site.pos}` +
                `\n   Progress: ${site.progress} / ${site.progressTotal}`;
        }
    }
    return msg;
};
// log an error for a creeps action, given an error code
mod.logErrorCode = function (creep, code) {
    if (code) {
        let error = translateErrorCode(code);
        if (creep) {
            if (error) creep.say(error);
            else creep.say(code);
        }
        let message = error + '\nroom: ' + creep.pos.roomName + '\ncreep: ' + creep.name + '\naction: ' + creep.data.actionName + '\ntarget: ' + creep.data.targetId;
        console.log(dye(CRAYON.error, message), Util.stack());
        Game.notify(message, 120);
    } else {
        let message = 'unknown error code\nroom: ' + creep.pos.roomName + '\ncreep: ' + creep.name + '\naction: ' + creep.data.actionName + '\ntarget: ' + creep.data.targetId;
        console.log(dye(CRAYON.error, message), Util.stack());
    }
};
// log some text as error
mod.logError = function (message, entityWhere) {
    if (entityWhere) {
        trace('error', entityWhere, dye(CRAYON.error, message));
    } else {
        console.log(dye(CRAYON.error, message), Util.stack());
    }
};
// trace an error or debug statement
mod.trace = function (category, entityWhere, ...message) {
    if (!(Memory.debugTrace[category] === true || _(entityWhere).reduce(reduceMemoryWhere, 1) === true)) return;
    if (Memory.debugTrace.no && _(entityWhere).pairs().some(noMemoryWhere) === true) return;

    let msg = message;
    let key = '';
    if (message.length === 0 && category) {
        let leaf = category;
        do {
            key = leaf;
            leaf = entityWhere[leaf];
        } while (entityWhere[leaf] && leaf != category);

        if (leaf && leaf != category) {
            if (typeof leaf === 'string') {
                msg = [leaf];
            } else {
                msg = [key, '=', leaf];
            }
        }
    }

    console.log(Game.time, dye(CRAYON.error, category), ...msg, dye(CRAYON.birth, JSON.stringify(entityWhere)), Util.stack());
};
// log some text as "system message" showing a "referrer" as label
mod.logSystem = function (roomName, message) {
    let text = dye(CRAYON.system, roomName);
    console.log(dye(CRAYON.system, `<a href="/a/#!/room/${Game.shard.name}/${roomName}">${text}</a> &gt; `) + message, Util.stack());
};
mod.isObj = function (val) {
    if (val === null) {
        return false;
    }
    return ((typeof val === 'function') || (typeof val === 'object'));
};
// for notify mails: transform server time to local
mod.toLocalDate = function (date) {
    if (!date) date = new Date();
    let offset = TIME_ZONE;
    if (USE_SUMMERTIME && isSummerTime(date)) offset++;
    return new Date(date.getTime() + (3600000 * offset));
};
// for notify mails: format dateTime (as date & time)
mod.toDateTimeString = function (date) {
    return (len(date.getDate()) + "." + len(date.getMonth() + 1) + "." + len(date.getFullYear()) + " " + len(date.getHours()) + ":" + len(date.getMinutes()) + ":" + len(date.getSeconds()));
};
// for notify mails: format dateTime (as time only)
mod.toTimeString = function (date) {
    return (len(date.getHours()) + ":" + len(date.getMinutes()) + ":" + len(date.getSeconds()));
};
// prefix 1 digit numbers with an 0
mod.len = function (number) {
    return ("00" + number).slice(-2);
};
// determine if a given dateTime is within daylight saving time (DST)
// you may need to adjust that to your local summer time rules
// default: Central European Summer Time (CEST)
mod.isSummerTime = function (date) {
    let year = date.getFullYear();
    // last sunday of march
    let temp = new Date(year, 2, 31);
    let begin = new Date(year, 2, temp.getDate() - temp.getDay(), 2, 0, 0);
    // last sunday of october
    temp = new Date(year, 9, 31);
    let end = new Date(year, 9, temp.getDate() - temp.getDay(), 3, 0, 0);

    return (begin < date && date < end);
};
// add a game object, obtained from its id, to an array
mod.addById = function (array, id) {
    if (array == null) array = [];
    let obj = Game.getObjectById(id);
    if (obj) array.push(obj);
    return array;
};
// send up to REPORTS_PER_LOOP notify mails, which are cached in memory
mod.processReports = function () {
    // if there are some in memory
    if (!_.isUndefined(Memory.statistics) && !_.isUndefined(Memory.statistics.reports) && Memory.statistics.reports.length > 0) {
        let mails;
        // below max ?
        if (Memory.statistics.reports.length <= REPORTS_PER_LOOP) {
            // send all
            mails = Memory.statistics.reports;
            Memory.statistics.reports = [];
        } else {
            // send first chunk
            let chunks = _.chunk(Memory.statistics.reports, REPORTS_PER_LOOP);
            mails = chunks[0];
            Memory.statistics.reports = _(chunks).tail().concat();
        }
        let send = mail => Game.notify(mail);
        _.forEach(mails, send);
    }
};
// get movement range between rooms
// respecting environmental walls
// uses memory to cache for ever
mod.routeRange = function (fromRoom, toRoom) {
    if (fromRoom === toRoom) return 0;
    if (_.isUndefined(Memory.routeRange)) {
        Memory.routeRange = {};
    }
    if (_.isUndefined(Memory.routeRange[fromRoom])) {
        Memory.routeRange[fromRoom] = {};
    }
    if (_.isUndefined(Memory.routeRange[fromRoom][toRoom])) {
        // ensure start room object
        let room = null;
        if (fromRoom instanceof Room) room = fromRoom;
        else room = Game.rooms[fromRoom];
        if (_.isUndefined(room)) return Room.roomDistance(fromRoom, toRoom, false);
        // get valid route to room (respecting environmental walls)
        let route = room.findRoute(toRoom, false, false);
        if (_.isUndefined(route)) return Room.roomDistance(fromRoom, toRoom, false);
        // store path length for ever
        Memory.routeRange[fromRoom][toRoom] = route == ERR_NO_PATH ? Infinity : route.length;
    }
    return Memory.routeRange[fromRoom][toRoom];
};
// turn brown flags into wall construction sites
// save positions in memory (to ignore them for repairing)
mod.pave = function (roomName) {
    let flags = _.values(Game.flags).filter(flag => flag.pos.roomName == roomName && flag.color == COLOR_BROWN);
    let val = Memory.pavementArt[roomName] === undefined ? '' : Memory.pavementArt[roomName];
    let posMap = flag => 'x' + flag.pos.x + 'y' + flag.pos.y;
    Memory.pavementArt[roomName] = val + flags.map(posMap).join('') + 'x';
    let setSite = flag => flag.room.createConstructionSite(flag, STRUCTURE_WALL);
    flags.forEach(setSite);
    let remove = flag => flag.remove();
    flags.forEach(remove);
};
mod.unpave = function (roomname) {
    if (!Memory.pavementArt || !Memory.pavementArt[roomname]) return false;
    let room = Game.rooms[roomname];
    if (!room) return false;
    let unpaved = structure => Memory.pavementArt[roomname].indexOf('x' + structure.pos.x + 'y' + structure.pos.y + 'x') >= 0;
    let structures = room.structures.all.filter(unpaved);
    let destroy = structure => structure.destroy();
    if (structures) structures.forEach(destroy);
    delete Memory.pavementArt[roomname];
    return true;
};
mod.guid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
mod.countPrices = function (orderType, mineral, roomName) {

    let prices = function (orderType, mineral, amount, roomName) {

            return Game.market.getAllOrders(o => {

                let transactionCost,
                    credits;

                if (o.type !== orderType || o.resourceType !== mineral || o.amount < amount)
                    return false;
                else {
                    transactionCost = Game.market.calcTransactionCost(amount, o.roomName, roomName);
                    if (transactionCost > Game.rooms[roomName].terminal.store[RESOURCE_ENERGY])
                        return false;
                    credits = amount * o.price;
                    o.transactionAmount = Math.min(o.amount, amount);
                    o.ratio = (credits - (transactionCost * global.ENERGY_VALUE_CREDITS)) / o.transactionAmount;
                    return true;
                }
            });
        };

    Array.prototype.sum = function () {
        return this.reduce(function (sum, a) {
            return sum + Number(a)
        }, 0);
    };

    Array.prototype.average = function () {
        return this.sum() / (this.length || 1);
    };

    switch (orderType) {

        case 'buy':

            let allBuyOrders = prices('buy', mineral, global.MIN_MINERAL_SELL_AMOUNT, roomName),
                minBuyOrder = _.min(allBuyOrders, 'ratio'),
                buyOrders = _.filter(allBuyOrders, order => {
                    return order.id !== minBuyOrder.id;
                }),
                buyRatios = [],
                buyRatio;

            for (let order of buyOrders)
                buyRatios.push(order.ratio);

            buyRatio = global.roundUp(buyRatios.average(), 4);
            return buyRatio;

        case 'sell':

            let allSellOrders = prices('sell', mineral, global.TRADE_THRESHOLD, roomName),
                maxSellOrder = _.max(allSellOrders, 'ratio'),
                sellOrders = _.filter(allSellOrders, order => {
                    return order.id !== maxSellOrder.id;
                }),
                sellRatios = [],
                sellRatio;

            for (let order of sellOrders)
                sellRatios.push(order.ratio);

            sellRatio = global.roundUp(sellRatios.average(), 4);
            return sellRatio;

    }
};
mod.BB = function (x) {
    console.log(JSON.stringify(x, null, 2));
};
mod.json = function (x) {
    return JSON.stringify(x, null, 2);
};
mod.sumCompoundType = function (object, property = 'amount') {
    return _(object).flatten().groupBy('type').transform((result, val, key) => (result[key] = _.sum(val, property))).value();
};
// TODO there is a lodash for it
mod.roundUp = function (num, precision = 0) {
    precision = Math.pow(10, precision);
    return Math.ceil(num * precision) / precision;
};
mod.roundUpTo = function (number, upTo) {
    if (number % upTo !== 0)
        number = number + upTo - number % upTo;
    return number;
};
mod.roundDownTo = function (number, downTo) {
    if (number % downTo !== 0)
        number = number - downTo + number % downTo;
    return number;
};
mod.orderingRoom = function () {
    return _.filter(myRooms, room => {
        let data = room.memory.resources;
        if (_.isUndefined(data) || _.isUndefined(data.orders))
            return false;
        if (_.isUndefined(data.boostTiming))
            data.boostTiming = {};
        return data.orders.length > 0 && _.sum(data.orders, 'amount') > 0;
    });
};
mod.unAllocateCompound = function (type) {

    let typeExist = function () {

            let returnArray = [];

            Object.keys(Memory.allocateProperties.lastAllocated).forEach(guid => {

                let guidObject = Memory.allocateProperties.lastAllocated[guid];

                if (guidObject.type === type)
                    returnArray.push(guid);
            });
            return returnArray;
        },
        unAllocate = function (guid) {

            let unAllocateObject = Memory.allocateProperties.lastAllocated[guid];

            for (let compound of unAllocateObject.compounds) {
                let allocateRooms = Memory.compoundsToAllocate[compound].allocateRooms;
                for (let room of allocateRooms)
                    allocateRooms.splice(allocateRooms.indexOf(room), 1);

                Memory.compoundsToAllocate[compound].allocateRooms = allocateRooms;

                if (allocateRooms.length === 0) {
                    Memory.compoundsToAllocate[compound].storeTo = 'storage';
                }
                delete Memory.allocateProperties.lastAllocated[guid];
            }
        },
        guidArray = typeExist();

    if (guidArray.length === 0) {
        console.log(`no GUID for: ${type}`);
        return;
    }



    for (let guid of guidArray) {

        let guidObject = Memory.allocateProperties.lastAllocated[guid];

        switch (type) {
            case 'defense':

                let invadedRooms = _.filter(guidObject.invadedRooms, room => {
                    return Game.rooms[room].hostiles.length > 0;
                });

                if (invadedRooms.length === 0) {
                    console.log(`hostiles GONE unAllocating`);
                    unAllocate(guid);
                    console.log(`unallocate: ${type}`);
                } else {
                    console.log(`there are invaders in:`);
                    global.BB(invadedRooms);
                }

            break;
            case 'miner':
                for (let room of guidObject.allocateRooms)
                    Util.inQueue({behaviour: 'remoteMiner', room: 'W0N0'});


                // stuff
            break;
            case 'worker':
                // stuff
            break;
        }

    }

};

mod._sellOrders = function (mineral) {

    if (!global.__sellOrders)
        global.__sellOrders = {};

    if (!global.__sellOrders_update)
        global.__sellOrders_update = {};

    if ((global.__sellOrders_update[mineral] || 0) !== Game.time || !global.__sellOrders[mineral]) {

        global.__sellOrders[mineral] = Game.market.getAllOrders({resourceType: mineral, type: ORDER_SELL});
        global.__sellOrders_update[mineral] = Game.time;
    }
    return global.__sellOrders[mineral];
};

mod._buyOrders = function (mineral) {

    if (!global.__buyOrders)
        global.__buyOrders = {};

    if (!global.__buyOrders_update)
        global.__buyOrders_update = {};

    if ((global.__buyOrders_update[mineral] || 0) !== Game.time || !global.__buyOrders[mineral]) {

        global.__buyOrders[mineral] = Game.market.getAllOrders({resourceType: mineral, type: ORDER_BUY});
        global.__buyOrders_update[mineral] = Game.time;
    }
    return global.__buyOrders[mineral];
};

Object.defineProperty(global, 'observerRequests', {
    configurable: true,
    get: function () {
        return Util.get(global, '_observerRequests', []);
    },
    /**
     * Pass an object containing room information to the requests
     * @param {Object} request - `roomName` property required
     */
    set: function (request) {
        Util.get(global, '_observerRequests', []).push(request);
    }
});


// TODO myRooms can get from a filter too, not from memory.stats.rooms (let myRooms = _.filter(Game.rooms, {'my': true});)
// TODO now it`s doing from Memory.stats.rooms
Object.defineProperty(global, 'myRooms', {
    configurable: true,
    get: function () {
        if (Memory.stats.rooms) {
            if (_.isUndefined(this._myRooms)) {
                this._myRooms = [];
                _.forEach(Memory.stats.rooms, room => {
                    this._myRooms.push(Game.rooms[room.name]);
                })
            }
        }
        return this._myRooms;
    }
});

Object.defineProperty(global, 'acceptedRooms', {
    configurable: true,
    get: function () {
        if (Memory.stats.rooms) {
            if(_.isUndefined(this._acceptedRoomsUpdated))
                this._acceptedRoomsUpdated = Game.time;
            if (_.isUndefined(this._acceptedRooms) || Game.time >= this._acceptedRoomsUpdated) {
                this._acceptedRooms = [];
                this._acceptedRoomsUpdated = Memory.stats.tick + global.GRAFANA_INTERVAL
                _.forEach(Memory.stats.rooms, room => {
                    if (room.storage && room.terminal)
                        this._acceptedRooms.push(Game.rooms[room.name]);
                })
            }
        }
        return this._acceptedRooms;
    }
});




mod = _.bindAll(mod);
