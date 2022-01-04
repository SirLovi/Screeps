global._ME = _(Game.rooms).map('controller').filter('my').map('owner.username').first();
let mod = {
	ME: _ME,
	CHATTY: false, // creeps say their current action
	HONK: true, // HONK when stored path is blocked by other creeps
	OOPS: true, // Creeps say Oops when dropping energy during dropmining
	SAY_ASSIGNMENT: true, // say a symbol representing the assiged action
	SAY_PUBLIC: true, // creeps talk public
	DEBUG: true, // gimme some more details, use false not undefined to unset
	DEBUG_STACKS: false, // add stack frame to EVERY console.log message (spammy!)
	TRACE: false, // use Memory.debugTrace for low-level information
	PROFILE: false, // enable CPU profiling
	PROFILING: {
		ANALYZE_LIMIT: 2, // profile warning levels
		AVERAGE_USAGE: true, // writePlanToMemory average creep & flag usage
		BASIC_ONLY: false, // only writePlanToMemory basic profiling information, disables all other profiling
		BEHAVIOUR: true, // profile behaviour action assignment
		CREEPS: true, // writePlanToMemory creep profiling information
		CREEP_TYPE: '', // define a specific creep to profile, requires CREEPS=true
		EXECUTE_LIMIT: 5, // profile warning levels
		FLAGS: true, // writePlanToMemory flag profiling information
		FLUSH_LIMIT: 5, // profile warning levels
		MAIN: true, // profile main loop
		MIN_THRESHOLD: 0.5, // set the bar for checks that involve very low usage (warning, chatty!)
		REGISTER_LIMIT: 2, // profile warning levels
		ROOMS: true, // writePlanToMemory room and structure profiling information
		VISUALS: true, // profile visuals
		VISUALS_LIMIT: 0.2, // CPU usage in each part of visuals above this limit will be displayed
	},
	TRAVELER_STUCK_TICKS: 2, // Number of ticks not moving to be considered stuck by the Traveler API
	TRAVELER_THRESHOLD: 5, // Average creep CPU usage/tick before warning about pathing cost, starts after 25 ticks
	USE_UNBUILT_ROADS: true, // enabling this will set the pathing cost of road construction sites to that of roads
	GRAFANA: true, // track for Grafana data
	GRAFANA_INTERVAL: 15, // loops between Grafana tracking - No lower than 3.
	CENSUS_ANNOUNCEMENTS: false, // log birth and death
	OFFSPRING_ANNOUNCEMENTS: false,
	SELL_NOTIFICATION: false, // send mail when selling minerals
	SPAWN_INTERVAL: 5, // loops between regular spawn probe
	ROOM_VISUALS: false, // basic room statistics with RoomVisuals
	ROOM_VISUALS_ALL: false, // displays visuals in all rooms you have vision in. Only your rooms when false.
	VISUALS: { // if ROOM_VISUALS is enabled, you can select what you want to writePlanToMemory - All is a bit much for some people.
		VISIBLE_ONLY: true, // depends on userscript: https://github.com/Esryok/screeps-browser-ext/blob/master/visible-room-tracker.user.js
		ROOM: false, // displays basic info relative to the room
		ROOM_GLOBAL: false, // displays basic info relative to your account - requires ROOM: true
		INFO_PIE_CHART: false, // replaces the info bars with pie charts
		CPU: false, // writePlanToMemory a graph containing CPU used, CPU limit, and bucket
		ROOM_ORDERS: true, // writePlanToMemory orders the room creates
		ROOM_OFFERS: true, // writePlanToMemory what a room will offer another
		SPAWN: false, // displays creep name and spawn progress percentage when spawning
		CONTROLLER: false, // displays level, progress, and ticks to downgrade if active
		STORAGE: false, // displays storage contents
		TERMINAL: false, // displays terminal contents
		TOWER: false, // displays tower contents
		TRANSACTIONS: true, // displays 2 most recent transactions over room terminal
		LABS: true, // displays lab energy, mineral, or cooldown
		MINERAL: false, // displays mineral amount, or ticks to regen
		SOURCE: false, // displays energy amount, or ticks to regen
		CREEP: false, // draws creep paths
		WALL: false, // highlight weakest wall and writePlanToMemory hits
		RAMPART: false, // highlight weakest rampart and writePlanToMemory hits
		ROAD: false, // highlight weakest road and writePlanToMemory hits
		HEATMAP: false, // collects creep positioning to writePlanToMemory a heatmap. WARNING: HIGH MEMORY USAGE
		HEATMAP_INTERVAL: 2, // intervals between collections
		ACTION_ASSIGNMENT: false, // draws a line from a creep and it's new assignment
		CONTAINER: false, // displays container amount of resources in x/2000 format
		DRAW_ARROW: false, // draw arrow to the target
		HIGHLIGHT_STRUCTURE: false, // highlight target structure
	},
	// function parameters: room. expected result: boolean
	SEMI_AUTOMATIC_CONSTRUCTION: true, // enables semi-automatic construction. Will construct based on flags.
	// function parameters: room, structure type. expected result: boolean
	REMOVE_CONSTRUCTION_FLAG: true, // if false, flag will remain. This is good if a structure decays, it can rebuild
	MAX_STORAGE_ENERGY: { // get rid of energy when reached
		1: 2000,
		2: 2000,
		3: 2000,
		4: 5000,
		5: 10000,
		6: 25000,
		7: 50000,
		8: 300000,
	},
	MIN_STORAGE_ENERGY: { // prefer storing energy until reached
		1: 1000,
		2: 1000,
		3: 1000,
		4: 1000,
		5: 5000,
		6: 10000,
		7: 25000,
		8: 100000,
	},
	MAX_STORAGE_MINERAL: 200000, // keep a max of minerals in store
	MAX_STORAGE_NOT_ROOM_MINERAL: 50000, // amount of not room minerals in store
	MAX_TERMINAL_MINERAL: 150000, // maximum amount of all minerals in terminal
	TERMINAL_ENERGY: 100000,
	ENERGY_BALANCE_TRANSFER_AMOUNT: 50000,      // amount to transfer when balancing empire energy
	TARGET_STORAGE_SUM_RATIO: 0.9,
	// SELL_COMPOUND: {
	// 	XGH2O: {    // +100% upgradeController effectiveness without increasing the energy cost
	// 		sell: true, // sell or not
	// 		urgent: true, // false => sell price is the average price of the existing offers, true => sell price is lower then the lowest price
	// 		defaultPrice: 1, // sell price if there is no existing offers, and there is no order above it.
	// 		rooms: [], // affected rooms, empty array means all rooms
	// 		maxStorage: 20000, // selling starts above this amount
	// 	},
	// 	XUH2O: {    // +300% attack effectiveness
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 10000,
	// 	},
	// 	XKHO2: {    // +300% rangedAttack and rangedMassAttack effectiveness
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 10000,
	// 	},
	// 	XLHO2: {    // +300% heal and rangedHeal effectiveness
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 10000,
	// 	},
	// 	XGHO2: {    // -70% damage taken
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 10000,
	// 	},
	// 	XZH2O: {    // +300% dismantle effectiveness
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 10000,
	// 	},
	// 	XKH2O: {    // +150 capacity
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 10000,
	// 	},
	// 	XZHO2: {    // +300% fatigue decrease speed
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 10000,
	// 	},
	// 	XUHO2: {    // +600% harvest effectiveness
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 5000,
	// 	},
	// 	XLH2O: {    // +100% repair and build effectiveness without increasing the energy cost
	// 		sell: true,
	// 		urgent: true,
	// 		defaultPrice: 1,
	// 		rooms: [],
	// 		maxStorage: 5000,
	// 	},
	// },
	ROOM_TRADING: true, // set this true to enable haulers within your colony to request resources from other rooms in your colony
	FILL_POWERSPAWN: true,
	MIN_MINERAL_SELL_AMOUNT: 3000,
	MIN_ENERGY_SELL_AMOUNT: 3000,
	MIN_COMPOUND_SELL_AMOUNT: 1000,
	DEFAULT_COMPOUND_SELL_AMOUNT: 3000,
	// ENERGY_VALUE_CREDITS: 0.9, // assumed energy exchange rate (in credits) to determine best mineral sell offer (it is a global property  global.energyPrice now)
	//MAX_SELL_RANGE: 60,
	// AUTOMATED_RATIO_COUNT: true, // count average ratios according to the market. Sell and buy happens above/bellow the average
	MARKET_SELL_NOT_RCL8_ROOMS: false, // sell the surplus in rooms under RCL8MIN_MINERAL_SELL_AMOUNT
	// MIN_SELL_RATIO: {
	// 	'H': 0.1,
	// 	'O': 0.1,
	// 	'L': 0.1,
	// 	'U': 0.1,
	// 	'K': 0.1,
	// 	'Z': 0.1,
	// 	'X': 0.1,
	// },
	// prices for automated buy, adjust it to your shard prices
	// MAX_BUY_RATIO: {
	// 	'H': 0.3,
	// 	'O': 0.3,
	// 	'L': 0.3,
	// 	'U': 0.3,
	// 	'K': 0.3,
	// 	'Z': 0.3,
	// 	'X': 0.3,
	// },
	MAX_REPAIR_LIMIT: { // Limits how high structures get repaired by towers, regarding RCL
		1: 1000,
		2: 1000,
		3: 2000,
		4: 4000,
		5: 8000,
		6: 15000,
		7: 20000,
		8: 40000,
	},
	MIN_FORTIFY_LIMIT: { // Minimum fortification level
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 0,
		7: 0,
		8: 1000000,     // focus is usually RCL growth, so 0 until 8
	},
	MAX_FORTIFY_LIMIT: { // Limits how high structures get repaired by creeps, regarding RCL
		1: 1000,
		2: 1000,
		3: 2000,
		4: 50000,
		5: 100000,
		6: 300000,
		7: 750000,
		8: 300000000,
	},
	MAX_FORTIFY_CONTAINER: 50000,
	LIMIT_URGENT_REPAIRING: 750, // urgent repair when hits below
	GAP_REPAIR_DECAYABLE: 800, // decayables (e.g. roads) only get repaired when that much hits are missing
	MEMORY_RESYNC_INTERVAL: 500, // interval to reload spawns & towers present in a room
	TIME_REPORT: 28000, // ticks between room reports
	REPORT_MAX_LENGTH: 500,
	REPORTS_PER_LOOP: 18,
	SEND_STATISTIC_REPORTS: false, // Set to true to receive room statistics per mail, otherwise set to false.
	ROAD_CONSTRUCTION_ENABLE: 8, // Set to False to disable automatic road construction, or to a number to enable for owned rooms reaching that RC Level. WARNING: HIGH MEMORY USAGE
	ROAD_CONSTRUCTION_FORCED_ROOMS: {'shard1': []}, //Add room names to force automatic road construction regardless of ROAD_CONSTRUCTION_ENABLE e.g. {'shard0':['W0N0','W1N0'],'shard1':['W0N0', 'W1N0']}.
	ROAD_CONSTRUCTION_INTERVAL: 2000,
	ROAD_CONSTRUCTION_MIN_DEVIATION: 1.2,
	ROAD_CONSTRUCTION_ABS_MIN: 3,
	TIME_ZONE: 2, // zone offset in hours (-12 through +12) from UTC
	USE_SUMMERTIME: true, // Please define isSummerTime in global.js to suit to your local summertime rules
	SPAWN_DEFENSE_ON_ATTACK: true, // This will attempt to store enough to have a defense and spawn troops when invaded.
	MANAGED_CONTAINER_TRIGGER: 0.25, // managed containers get filled below this relative energy amount and emptied when above 1-this value
	/*
	ROUTE_ROOM_COST: // custom room routing cost: e.g. `{'shard0':{ 'W0N0':5, 'W4N4': 11 },'shard1':...}`. Affects bestSpawnRoomFor, Creep.Setup calculations, and travel cost predictions. Please call 'delete Memory.routeRange;' whenever you change this property.
		{
			'shard1': {
				'E15S4': 100,
				'E25S25': 100,
				'E25S26': 100
			}
		},
		*/
	ROUTE_ROOM_COST: {'shard1': {}}, // custom room routing cost: e.g. `{'shard0':{ 'W0N0':5, 'W4N4': 11 },'shard1':...}`. Affects bestSpawnRoomFor, Creep.Setup calculations, and travel cost predictions. Please call 'delete Memory.routeRange;' whenever you change this property.
	TRAVELLING_BORDER_RANGE: 22, // room arrival distance for travelling and routes
	NOTIFICATE_INVADER: false, // Also log common 'Invader' hostiles
	NOTIFICATE_INTRUDER: true, // Log any hostiles in your rooms
	NOTIFICATE_HOSTILES: true, // Log any hostiles - Ignores NOTIFICATE_INTRUDER and NOTIFICATE_INVADER
	COMBAT_CREEPS_RESPECT_RAMPARTS: true, // causes own creeps not to leave through ramparts when defending
	COST_MATRIX_VALIDITY: 1000,
	// function parameters: room. expected result: array
	CONSTRUCTION_PRIORITY: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_TERMINAL, STRUCTURE_STORAGE, STRUCTURE_TOWER, STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER, STRUCTURE_OBSERVER, STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_EXTRACTOR, STRUCTURE_LAB, STRUCTURE_WALL, STRUCTURE_RAMPART],
	CONTROLLER_SIGN: true,
	// function parameters: room. expected result: string
	CONTROLLER_SIGN_MESSAGE: `[YP] claimed by Zolcsika`,
	CONTROLLER_SIGN_UPDATE: true, // Update sign message if user changes CONTROLLER_SIGN_MESSAGE
	MINERS_AUTO_BUILD: true, // miners and remoteMiners will build their own containers if they are missing.
	MINER_WORK_THRESHOLD: 50, // how long to wait before a miner checks for repairs/construction sites nearby again
	REMOTE_HAULER: {
		ALLOW_OVER_CAPACITY: 2450, // Hauler capacity rounds up by MIN_WEIGHT, or this number value.
		DRIVE_BY_BUILD_ALL: false, // If REMOTE_HAULER.DRIVE_BY_BUILDING is enabled then this option will allow remote haulers will drive-by-build any of your structures.
		DRIVE_BY_BUILD_RANGE: 1, // A creep's max build distance is 3 but cpu can be saved by dropping the search distance to 1.
		DRIVE_BY_BUILDING: true, // Allows remote haulers to build roads and containers. Consider setting REMOTE_WORKER_MULTIPLIER to 0.
		DRIVE_BY_REPAIR_RANGE: 1, // range that remote haulers should search when trying to repair and move
		DRIVE_BY_REPAIR_RANGE_ROAD: 0,
		MIN_LOAD: 0.75, // Haulers will return home as long as their ratio of carrying/capacity is above this amount.
		MIN_WEIGHT: 800, // Small haulers are a CPU drain.
		MULTIPLIER: 4, // Max number of haulers spawned per source in a remote mining room.
		REHOME: true, // May haulers choose closer storage for delivery?
	},
	TASK_CREEP_CHECK_INTERVAL: 250, // Maximum number of ticks before a task checks to see if it needs to spawn new creeps
	REMOTE_RESERVE_HAUL_CAPACITY: 0.1, // Percent of allocated haul capacity before sending reservers.
	PIONEER_UNOWNED: false, // True: pioneers may attempt to work in unowned rooms.
	PRIVATEERS_BUILD: true, // True: robbers may attempt to build
	DRIVE_BY_REPAIR_RANGE: 1, // range that creeps should search when trying to repair and move
	DRIVE_BY_REPAIR_RANGE_ROAD: 0,
	REMOTE_WORKER_MULTIPLIER: 0, // Number of workers spawned per remote mining room.
	PLAYER_WHITELIST: ['Geir1983', 'admon', 'likeafox', 'Orlet', 'omnomwombat'],
	// Don't attack. Must be a member of CCC for permanent whitelisting in git repository. But you can change your own copy... Please ask if you are interested in joining CCC :)
	DEFENSE_BLACKLIST: [], // Don't defend those rooms (add room names). Blocks spawning via defense task (will not prevent offensive actions at all)
	CRITICAL_BUCKET_LEVEL: 1000, // take action when the bucket drops below this value to prevent the bucket from actually running out
	CRITICAL_BUCKET_OVERFILL: 200, // Overfill the bucket by this amount before disabling CPU throttle, this can reduce thrashing because all creeps try to act at once
	CRITICAL_ROLES: ['worker', 'collapseWorker', 'melee', 'ranger', 'healer', 'miner', 'hauler', 'upgrader'], // when the bucket drops below the critical bucket level only these creep roles will be executed
	ROBBER_REHOME: true, // May robbers choose closer storage for delivery?
	OBSERVER_OBSERVE_RANGE: 3, // the range for observers to look at
	OBSERVER_OBSERVE_HIGHWAYS_ONLY: true, // the observers will only look at highways - changing this will require you to clear cached rooms
	COMPRESS_COST_MATRICES: false, // enable to compress cached cost matrices (1/5 the size, but currently about 2x CPU usage)
	ACTION_SAY: { // what gets said on creep.action.*.onAssignment
		ATTACK_CONTROLLER: String.fromCodePoint(0x1F5E1) + String.fromCodePoint(0x26F3), // 🗡⛳
		AVOIDING: String.fromCodePoint(0x21A9), // ↩
		BOOSTING: String.fromCodePoint(0x1F4AA), // 💪🏼
		BUILDING: String.fromCodePoint(0x2692), // ⚒
		BULLDOZING: String.fromCodePoint(0x1F69C), // 🚜
		CHARGING: String.fromCodePoint(0x1F50C), // 🔌
		CLAIMING: String.fromCodePoint(0x26F3), // ⛳
		DEFENDING: String.fromCodePoint(0x2694), // ⚔
		DISMANTLING: String.fromCodePoint(0x1F527), // 🔧
		DROPPING: String.fromCodePoint(0x1F4A9), // 💩
		FEEDING: String.fromCodePoint(0x1F355), // 🍕
		FORTIFYING: String.fromCodePoint(0x1F528), // 🔨
		FUELING: String.fromCodePoint(0x26FD), // ⛽
		GUARDING: String.fromCodePoint(0x1F46E) + String.fromCodePoint(0x1F3FC), // 👮🏼
		HARVESTING: String.fromCodePoint(0x26CF), // ⛏
		HEALING: String.fromCodePoint(0x26E8), // ⛨
		IDLE: String.fromCodePoint(0x1F3B5), // 🎵
		INVADING: String.fromCodePoint(0x1F52B), // 🔫
		MINING: String.fromCodePoint(0x26CF), // ⛏
		PICKING: String.fromCodePoint(0x23EC), // ⏬
		REALLOCATING: String.fromCodePoint(0x2194), // ↔
		RECYCLING: String.fromCodePoint(0x267B), // ♻
		REPAIRING: String.fromCodePoint(0x1F528), // 🔨
		RESERVING: String.fromCodePoint(0x26F3), // ⛳
		ROBBING: String.fromCodePoint(0x1F480), // 💀
		SAFEGEN: String.fromCodePoint(0x1F512), // 🔒
		STORING: String.fromCodePoint(0x1F4E5) + String.fromCodePoint(0xFE0E), // 📥
		TRAVELLING: String.fromCodePoint(0x1F3C3), // 🏃
		UNCHARGING: String.fromCodePoint(0x1F50B), // 🔋
		UPGRADING: String.fromCodePoint(0x1F5FD), // 🗽
		WITHDRAWING: String.fromCodePoint(0x1F4E4) + String.fromCodePoint(0xFE0E), // 📤
	},
	COOLDOWN: {
		TOWER_URGENT_REPAIR: 10,
		TOWER_REPAIR: 50,
		CREEP_IDLE: 3,
	},
	TOWER_REPAIR: false,
	TOWER_URGENT_REPAIR: true,

	// automatedBoostProduction
	// rooms with storage, terminal and flower registered labs loaded with energy are needed for the process
	// optionally you can place a purple/white flag to spawn a labTech
	// use _.values(Game.structures).filter(i => i.structureType === 'lab').map(i => i.room.setStore(i.id, RESOURCE_ENERGY, 2000));
	// to fill labs with energy.
	// if something goes wrong use Util.resetBoostProduction(), and MAKE_COMPOUNDS = false to turn off the process;

	// auto flower register labs
	AUTO_REGISTER_LABS: true, // it needs MAKE_COMPOUNDS: true
	// make boostProduction on/off
	MAKE_COMPOUNDS: false,
	// checks the rooms in this interval to make compounds
	MAKE_COMPOUNDS_INTERVAL: 5,
	MAKE_REACTIONS_WITH_3LABS: false,
	CHECK_ORDERS_INTERVAL: 25,
	PURCHASE_MINERALS: true,
	STORE_CHARGE_PURCHASE: 0.4,
	// COMPOUNDS_TO_MAKE: {    // which compound to make
	// 	G: {                // for nukes
	// 		make: true,    // make it or not
	// 		roomThreshold: 5000, // start producing when room.resourcesAll[compound] <= roomThreshold
	// 		amount: 5000,   // amount to make when room.resourcesAll <= roomThreshold (keep producing, while room.resourcesAll[compound] < amount + roomThreshold)
	// 		rooms: [],       // rooms involved, leave it empty for all rooms
	// 	},
	// 	GH2O: {        // +80% upgradeController effectiveness without increasing the energy cost
	// 		make: true,
	// 		roomThreshold: 10000,
	// 		amount: 5000,
	// 		rooms: [],
	// 	},
	// 	XGH2O: {        // +100% upgradeController effectiveness without increasing the energy cost
	// 		make: true,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XUH2O: {        // +300% attack effectiveness
	// 		make: false,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XKHO2: {        // +300% rangedAttack and rangedMassAttack effectiveness
	// 		make: false,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XLHO2: {        // +300% heal and rangedHeal effectiveness
	// 		make: false,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XGHO2: {        // -70% damage taken
	// 		make: false,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XZH2O: {        // +300% dismantle effectiveness
	// 		make: false,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XKH2O: {        // +150 capacity
	// 		make: false,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XZHO2: {        // +300% fatigue decrease speed
	// 		make: false,
	// 		roomThreshold: 15000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XUHO2: {        // +600% harvest effectiveness
	// 		make: false,
	// 		roomThreshold: 9000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// 	XLH2O: {        // +100% repair and build effectiveness without increasing the energy cost
	// 		make: false,
	// 		roomThreshold: 9000,
	// 		amount: 3000,
	// 		rooms: [],
	// 	},
	// },
	TRADE_THRESHOLD: 1000,
	MIN_OFFER_AMOUNT: 100,
	MIN_COMPOUND_AMOUNT_TO_MAKE: 3000,

	// mineral allocation
	ALLOCATE_COMPOUNDS: false,
	ALLOCATE_COMPOUNDS_INTERVAL: 25,
	UNREGISTER_BOOSTLAB_AT: 450,
	// COMPOUNDS_TO_ALLOCATE: { // if modified -> delete Memory.compoundsToAllocate
	// 	G: {       // for Nukes
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 5000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	GH2O: {       // +80% upgradeController effectiveness without increasing the energy cost
	// 		allocate: true,
	// 		superior: 'XGH2O', // do not allocate when superior allocated or making with 10 labs
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 5000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XGH2O: {       // +100% upgradeController effectiveness without increasing the energy cost
	// 		allocate: true, // allocate this compound
	// 		allocateRooms: [], // rooms to allocate, leave it empty for all rooms
	// 		roomThreshold: 5000, // room allocating will start when compound is below roomThreshold
	// 		amount: 3000,  // amount to allocate
	// 		storeTo: 'storage', // 'storage' or 'lab'
	// 		labRefilledAt: 1500, // lab refilled below this amount, it is meaningless if storeTo = 'storage'
	// 	},
	//
	// 	XUH2O: {       // +300% attack effectiveness
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XKHO2: {       // +300% rangedAttack and rangedMassAttack effectiveness
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XLHO2: {       // +300% heal and rangedHeal effectiveness
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XGHO2: {       //-70% damage taken
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XZH2O: {       // +300% dismantle effectiveness
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XKH2O: {       // +150 capacity
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XZHO2: {       // +300% fatigue decrease speed
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XUHO2: {       // +600% harvest effectiveness
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	XLH2O: {       // +100% repair and build effectiveness without increasing the energy cost
	// 		allocate: true,
	// 		allocateRooms: [],
	// 		roomThreshold: 5000,
	// 		amount: 3000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 1500,
	// 	},
	// 	power: {
	// 		allocate: true,
	// 		allocateRooms: [], // powers allocated between rooms with PowerSpawn only
	// 		roomThreshold: 100,
	// 		amount: 1000,
	// 		storeTo: 'storage',
	// 		labRefilledAt: 500,
	// 	},
	// },


	COMPOUNDS_MANAGE_ENABLED: false,
	TERMINAL_BROKER_SELL: true,
	TERMINAL_BROKER_SELL_ENERGY: true, // false for testing terminalBroker or reserve energy
	TERMINAL_BROKER_TRANSFER_ENERGY: true,
	COMPOUNDS_MANAGE_BUCKET: 5000,
	PROCESS_ORDERS_INTERVAL: 101, // interval to process room orders and run terminalBroker
	COMPOUNDS_MANAGE_TIMING: 5,
	COMPOUNDS_MANAGE: { // if modified -> DELETE Memory.compoundsManage!!!!
		G: {       // for Nukes
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 5000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		GH2O: {       // +80% upgradeController effectiveness without increasing the energy cost
			sell: false,
			urgentAllocate: false,
			superior: 'XGH2O', // do not allocate when superior allocated or making with 10 labs
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 5000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XGH2O: {       // +100% upgradeController effectiveness without increasing the energy cost
			sell: true,
			urgentAllocate: false, // urgently allocate this compound
			allocateRooms: [], // rooms to allocate, leave it empty for all rooms
			roomThreshold: 5000, // room allocating will start when compound is below roomThreshold
			reservedAmount: 3000,  // amount to allocate
			storeTo: 'storage', // 'storage' or 'lab'
			labRefilledAt: 1500, // lab refilled below this amount, it is meaningless if storeTo = 'storage'
		},

		XUH2O: {       // +300% attack effectiveness
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XKHO2: {       // +300% rangedAttack and rangedMassAttack effectiveness
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XLHO2: {       // +300% heal and rangedHeal effectiveness
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XGHO2: {       //-70% damage taken
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XZH2O: {       // +300% dismantle effectiveness
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XKH2O: {       // +150 capacity
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XZHO2: {       // +300% fatigue decrease speed
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XUHO2: {       // +600% harvest effectiveness
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		XLH2O: {       // +100% repair and build effectiveness without increasing the energy cost
			sell: false,
			urgentAllocate: false,
			allocateRooms: [],
			roomThreshold: 5000,
			reservedAmount: 3000,
			storeTo: 'storage',
			labRefilledAt: 1500,
		},
		power: {
			sell: false,
			urgent: false,
			allocateRooms: [], // powers allocated between rooms with PowerSpawn only
			roomThreshold: 100,
			reservedAmount: 1000,
			storeTo: 'storage',
			labRefilledAt: 500,
		},
	},
	// Memory garbage collection
	CLEAN_ROOM_MEMORY: {
		enabled: true,
		maxEnabledMemorySize: 2048,
		targetMemorySize: 2000,
		roadConstructionTrace: {
			enabled: false,
			timing: 100000,
		}
	},
	// nukes
	FILL_NUKER: true,
	ENABLE_NUKERS_ATTACK: {
		enabled: false,
		numberOfNukesToLaunch: 5,
		timer: 500,
		targetRoom: 'E19S19',
		coordinates: {
			x: 25,
			y: 16
		}
	},
	// segment communications
	SEGMENT_COMMS: {
		enabled: true,
		alliedList: [
			['Geir1983', 99],
			['admon', 99],
			['likeafox', 99],
		],
		sendAndRequestTiming: 98,
		trackTiming: 99,
		acceptableMinerals: ['energy', 'X', 'O', 'H', 'L', 'U', 'K', 'Z'], // Acceptable array is the resources you are willing to trade out.
		minAmount: 300000, // The minimum you have of the above mineral before you trade.
	},
	// power mining
	AUTO_POWER_MINING: false, //set false to disable power mining (recommended until 1-2 RCL8+ rooms)
	MAX_AUTO_POWER_MINING_FLAGS: 2,
	POWER_MINE_LOG: true, //displays power mining info in console
	HANDLE_INVADERS_CORE: {
		enabled: true,
		display: true,
		timing: 100
	},
};
module.exports = mod;
