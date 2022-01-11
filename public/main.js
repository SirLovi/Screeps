const cpuAtLoad = Game.cpu.getUsed();

// check if a path is valid
global.validatePath = path => {
	let mod;
	try {
		mod = require(path);
	} catch (e) {
		if (global.DEBUG !== false && !(e.message && e.message.startsWith('Unknown module'))) {
			console.log('<font style="color:FireBrick">Error loading ' + path
				+ ' caused by ' + (e.stack || e.toString()) + '</font>');
		}
		mod = null;
	}
	return mod != null;
};
// evaluate existing module overrides and store them to memory.
// return current module path to use for require
global.getPath = (modName, reevaluate = false) => {
	if (reevaluate || !Memory.modules[modName]) {
		// find base file
		let path = './custom.' + modName;

		if (!validatePath(path)) {
			path = './internal.' + modName;
			if (!validatePath(path))
				path = './' + modName;
		}
		Memory.modules[modName] = path;

		// find viral file
		path = './internalViral.' + modName;

		if (validatePath(path))
			Memory.modules.internalViral[modName] = true;
		else if (Memory.modules.internalViral[modName])
			delete Memory.modules.internalViral[modName];

		path = './viral.' + modName;

		if (validatePath(path))
			Memory.modules.viral[modName] = true;
		else if (Memory.modules.viral[modName])
			delete Memory.modules.viral[modName];
	}
	return Memory.modules[modName];
};
// try to require a module. Log errors.
global.tryRequire = (path, silent = false) => {
	let mod;

	try {
		mod = require(path);
	} catch (e) {
		if (e.message && e.message.indexOf('Unknown module') > -1) {
			if (!silent) console.log(`Module "${path}" not found!`);
		} else if (mod == null) {
			console.log(`Error loading module "${path}"!<br/>${e.stack || e.toString()}`);
		}
		mod = null;
	}
	return mod;
};
// inject members of alien class into base class. specify a namespace to call originals from baseObject.baseOf[namespace]['<functionName>'] later
global.inject = (base, alien, namespace) => {
	let keys = _.keys(alien);

	for (const key of keys) {
		if (typeof alien[key] === 'function') {
			if (namespace) {
				let original = base[key];
				if (!base.baseOf) base.baseOf = {};
				if (!base.baseOf[namespace]) base.baseOf[namespace] = {};
				if (!base.baseOf[namespace][key]) base.baseOf[namespace][key] = original;
			}
			base[key] = alien[key].bind(base);
		} else if (alien[key] !== null && typeof base[key] === 'object' && !Array.isArray(base[key]) &&
			typeof alien[key] === 'object' && !Array.isArray(alien[key])) {
			_.merge(base[key], alien[key]);
		} else {
			base[key] = alien[key];
		}
	}
};
// partially override a module using a registered viral file
global.infect = (mod, namespace, modName) => {
	if (Memory.modules[namespace][modName]) {
		// get module from stored viral override path
		let viralOverride = tryRequire(`./${namespace}.${modName}`);
		// override
		if (viralOverride) {
			global.inject(mod, viralOverride, namespace);
		}
		// cleanup
		else
			delete Memory.modules[namespace][modName];
	}
	return mod;
};
// loads (require) a module. use this function anywhere you want to load a module.
// respects custom and viral overrides
global.load = (modName) => {
	// read stored module path
	let path = getPath(modName);
	// try to load module
	let mod = tryRequire(path, true);
	if (!mod) {
		// re-evaluate path
		path = getPath(modName, true);
		// try to load module. Log error to console.
		mod = tryRequire(path);
	}
	if (mod) {
		// load viral overrides
		mod = infect(mod, 'internalViral', modName);
		mod = infect(mod, 'viral', modName);
	}
	return mod;
};
// load code
global.install = () => {
	// ensure required memory namespaces
	if (Memory.modules === undefined) {
		Memory.modules = {
			valid: Game.time,
			viral: {},
			internalViral: {},
		};
	} else if (_.isUndefined(Memory.modules.valid)) {
		Memory.modules.valid = Game.time;
	}
	// Initialize global & parameters
	//let glob = load("global");
	global.inject(global, load('global'));
	_.assign(global, load('parameter'));
	global.mainInjection = load('mainInjection');

	// Load modules
	_.assign(global, {
		CompressedMatrix: load('compressedMatrix'),
		Extensions: load('extensions'),
		Population: load('population'),
		FlagDir: load('flagDir'),
		Task: load('task'),
		Tower: load('tower'),
		Util: load('util'),
		Events: load('events'),
		OCSMemory: load('ocsMemory'),
		Grafana: global.GRAFANA ? load('grafana') : undefined,
		Visuals: load('visuals'),
		SegmentCommunications: load('segmentCommunications'),
		CompoundManager: load('compoundManager'),
	});
	_.assign(global.Util, {
		DiamondIterator: load('util.diamond.iterator'),
		SpiralIterator: load('util.spiral.iterator'),
	});
	_.assign(global.Task, {
		guard: load('task.guard'),
		defense: load('task.defense'),
		mining: load('task.mining'),
		claim: load('task.claim'),
		reserve: load('task.reserve'),
		pioneer: load('task.pioneer'),
		attackController: load('task.attackController'),
		robbing: load('task.robbing'),
		reputation: load('task.reputation'),
		labTech: load('task.labTech'),
		safeGen: load('task.safeGen'),
		scheduler: load('task.scheduler'),
		train: load('task.train'),
	});
	Creep.Action = load('creep.Action');
	Creep.Behaviour = load('creep.Behaviour');
	Creep.Setup = load('creep.Setup');
	_.assign(Creep, {
		action: {
			attackController: load('creep.action.attackController'),
			avoiding: load('creep.action.avoiding'),
			boosting: load('creep.action.boosting'),
			building: load('creep.action.building'),
			bulldozing: load('creep.action.bulldozing'),
			charging: load('creep.action.charging'),
			claiming: load('creep.action.claiming'),
			defending: load('creep.action.defending'),
			dismantling: load('creep.action.dismantling'),
			dropping: load('creep.action.dropping'),
			feeding: load('creep.action.feeding'),
			fortifying: load('creep.action.fortifying'),
			fueling: load('creep.action.fueling'),
			guarding: load('creep.action.guarding'),
			harvesting: load('creep.action.harvesting'),
			healing: load('creep.action.healing'),
			idle: load('creep.action.idle'),
			invading: load('creep.action.invading'),
			mining: load('creep.action.mining'),
			picking: load('creep.action.picking'),
			reallocating: load('creep.action.reallocating'),
			recycling: load('creep.action.recycling'),
			repairing: load('creep.action.repairing'),
			reserving: load('creep.action.reserving'),
			robbing: load('creep.action.robbing'),
			storing: load('creep.action.storing'),
			travelling: load('creep.action.travelling'),
			uncharging: load('creep.action.uncharging'),
			upgrading: load('creep.action.upgrading'),
			withdrawing: load('creep.action.withdrawing'),
			safeGen: load('creep.action.safeGen'),
		},
		behaviour: {
			claimer: load('creep.behaviour.claimer'),
			collapseWorker: load('creep.behaviour.collapseWorker'),
			hauler: load('creep.behaviour.hauler'),
			healer: load('creep.behaviour.healer'),
			labTech: load('creep.behaviour.labTech'),
			melee: load('creep.behaviour.melee'),
			miner: load('creep.behaviour.miner'),
			mineralMiner: load('creep.behaviour.mineralMiner'),
			remoteMiner: load('creep.behaviour.remoteMiner'),
			remoteHauler: load('creep.behaviour.remoteHauler'),
			remoteWorker: load('creep.behaviour.remoteWorker'),
			pioneer: load('creep.behaviour.pioneer'),
			privateer: load('creep.behaviour.privateer'),
			ranger: load('creep.behaviour.ranger'),
			upgrader: load('creep.behaviour.upgrader'),
			worker: load('creep.behaviour.worker'),
			safeGen: load('creep.behaviour.safeGen'),
		},
		setup: {
			hauler: load('creep.setup.hauler'),
			healer: load('creep.setup.healer'),
			miner: load('creep.setup.miner'),
			mineralMiner: load('creep.setup.mineralMiner'),
			privateer: load('creep.setup.privateer'),
			upgrader: load('creep.setup.upgrader'),
			worker: load('creep.setup.worker'),
		},
	});
	global.inject(Creep, load('creep'));
	global.inject(Room, load('room'));
	_.assign(Room, {
		_ext: {
			construction: load('room.construction'),
			containers: load('room.container'),
			defense: load('room.defense'),
			extensions: load('room.extension'),
			labs: load('room.lab'),
			links: load('room.link'),
			nuker: load('room.nuker'),
			observers: load('room.observer'),
			orders: load('room.orders'),
			power: load('room.power'),
			resources: load('room.resources'),
			spawns: load('room.spawn'),
			towers: load('room.tower'),
			fillRoomOrders: load('room.fillRoomOrders'),
			boostProduction: load('room.boostProduction'),
			boostAllocation: load('room.boostAllocation'),
			cleanRoomMemory: load('room.cleanMemory'),
			// test: load("test"),
			handleInvadersCore: load('room.handleInvaderCore'),
		},
	});
	global.inject(Spawn, load('spawn'));

	// Extend server objects
	global.Extensions.extend();
	Creep.extend();
	Room.extend();
	Spawn.extend();
	global.FlagDir.extend();
	global.Task.populate();
	global.Visuals.extend();
	// custom extend
	if (global.mainInjection.extend)
		global.mainInjection.extend();
	global.OCSMemory.activateSegment(global.MEM_SEGMENTS.COSTMATRIX_CACHE, true);

	global.modulesValid = Memory.modules.valid;
	if (global.DEBUG)
		global.logSystem('Global.install', 'Code reloaded.');
};
global.install();
load('traveler')({exportTraveler: false, installTraveler: true, installPrototype: true, defaultStuckValue: TRAVELER_STUCK_TICKS, reportThreshold: TRAVELER_THRESHOLD});

function wrapLoop(fn) {
	let memory;
	let tick;

	return () => {
		if (tick && tick + 1 === Game.time && memory) {
			delete global.Memory;
			Memory = memory;
		} else {
			memory = Memory;
		}

		tick = Game.time;

		fn();

		// there are two ways of saving Memory with different advantages and disadvantages
		// 1. RawMemory.set(JSON.stringify(Memory));
		// + ability to use custom serialization method
		// - you have to pay for serialization
		// - unable to edit Memory via Memory watcher or console
		// 2. RawMemory._parsed = Memory;
		// - undocumented functionality, could get removed at any time
		// + the server will take care of serialization, it doesn't cost any CPU on your site
		// + maintain full functionality including Memory watcher and console

		RawMemory._parsed = Memory;

		// RawMemory.setPublicSegments([99]);
	};
}

let cpuAtFirstLoop;
module.exports.loop = wrapLoop(function () {

	const cpuAtLoop = Game.cpu.getUsed();

	if (Memory.pause)
		return;

	try {
		const totalUsage = global.Util.startProfiling('main', {startCPU: cpuAtLoop});
		const p = global.Util.startProfiling('main', {enabled: global.PROFILING.MAIN, startCPU: cpuAtLoop});

		p.checkCPU('deserialize memory', 5); // the profiler makes access to memory on startup

		// let the cpu recover a bit above the threshold before disengaging to prevent thrashing
		Memory.CPU_CRITICAL = Memory.CPU_CRITICAL ? Game.cpu.bucket < global.CRITICAL_BUCKET_LEVEL + global.CRITICAL_BUCKET_OVERFILL : Game.cpu.bucket < global.CRITICAL_BUCKET_LEVEL;

		if (!cpuAtFirstLoop)
			cpuAtFirstLoop = cpuAtLoop;

		// ensure required memory namespaces
		if (_.isUndefined(Memory.modules) || _.isUndefined(global.modulesValid) || global.modulesValid !== Memory.modules.valid)
			global.install();

		if (Memory.debugTrace === undefined)
			Memory.debugTrace = {error: true, no: {}};

		if (Memory.cloaked === undefined)
			Memory.cloaked = {};

		global.Util.set(Memory, 'parameters', {});
		_.assign(global, {parameters: Memory.parameters}); // allow for shorthand access in console

		// TODO there is no parameters is memory
		// ensure uptoDate parameters, override in memory
		_.assign(global, load('parameter'));
		_.merge(global, global.parameters);

		// process loaded memory segments
		global.OCSMemory.processSegments();
		p.checkCPU('processSegments', global.PROFILING.ANALYZE_LIMIT);

		// Flush cache
		global.Events.flush();
		global.FlagDir.flush();
		global.Population.flush();
		Room.flush();
		global.Task.flush();

		// custom flush
		if (global.mainInjection.flush)
			global.mainInjection.flush();

		p.checkCPU('flush', global.PROFILING.FLUSH_LIMIT);

		// Room event hooks must be registered before analyze for costMatrixInvalid
		// TODO it is an empty fn
		Room.register();

		// analyze environment, wait a tick if critical failure
		if (!global.FlagDir.analyze()) {
			global.Util.logError('FlagDir.analyze failed, waiting one tick to sync flags');
			return;
		}
		p.checkCPU('FlagDir.analyze', global.PROFILING.ANALYZE_LIMIT);

		Room.analyze();
		p.checkCPU('Room.analyze', global.PROFILING.ANALYZE_LIMIT);

		global.Population.analyze();
		p.checkCPU('Population.analyze', global.PROFILING.ANALYZE_LIMIT);

		global.SegmentCommunications.analyze();
		p.checkCPU('SegmentCommunications.analyze', global.PROFILING.ANALYZE_LIMIT);

		// custom analyze
		if (global.mainInjection.analyze)
			global.mainInjection.analyze();

		// Register event hooks
		Creep.register();
		Spawn.register();
		global.Task.register();

		// custom register
		if (global.mainInjection.register)
			global.mainInjection.register();

		p.checkCPU('register', global.PROFILING.REGISTER_LIMIT);

		// Execution
		global.Population.execute();
		p.checkCPU('population.execute', global.PROFILING.EXECUTE_LIMIT);

		global.FlagDir.execute();
		p.checkCPU('flagDir.execute', global.PROFILING.EXECUTE_LIMIT);

		Room.execute();
		p.checkCPU('room.execute', global.PROFILING.EXECUTE_LIMIT);

		Creep.execute();
		p.checkCPU('creep.execute', global.PROFILING.EXECUTE_LIMIT);

		Spawn.execute();
		p.checkCPU('spawn.execute', global.PROFILING.EXECUTE_LIMIT);

		global.Task.execute();
		p.checkCPU('task.execute', global.PROFILING.EXECUTE_LIMIT);

		// custom execute
		if (global.mainInjection.execute)
			global.mainInjection.execute();

		// Postprocessing
		if (global.SEND_STATISTIC_REPORTS) {
			if (!Memory.statistics || (Memory.statistics.tick && Memory.statistics.tick + global.TIME_REPORT <= Game.time))
				load('statistics').process();
			global.processReports(); // TODO it is in global AND Util
			p.checkCPU('processReports', global.PROFILING.FLUSH_LIMIT);
		}

		global.FlagDir.cleanup();
		p.checkCPU('FlagDir.cleanup', global.PROFILING.FLUSH_LIMIT);

		global.Population.cleanup();
		p.checkCPU('Population.cleanup', global.PROFILING.FLUSH_LIMIT);

		Room.cleanup();
		p.checkCPU('Room.cleanup', global.PROFILING.FLUSH_LIMIT);

		// custom cleanup
		if (global.mainInjection.cleanup)
			global.mainInjection.cleanup();

		global.OCSMemory.cleanup(); // must come last

		p.checkCPU('OCSMemory.cleanup', global.PROFILING.ANALYZE_LIMIT);

		if (global.ROOM_VISUALS && !Memory.CPU_CRITICAL)
			global.Visuals.run();
		p.checkCPU('visuals', global.PROFILING.EXECUTE_LIMIT);

		global.Grafana.run();
		p.checkCPU('grafana', global.PROFILING.EXECUTE_LIMIT);

		global.CompoundManager.run();
		p.checkCPU('compoundManager', global.PROFILING.EXECUTE_LIMIT);

		Game.cacheTime = Game.time;

		if (global.DEBUG && global.TRACE)
			global.trace('main', {cpuAtLoad, cpuAtFirstLoop, cpuAtLoop, cpuTick: Game.cpu.getUsed(), isNewServer: global.isNewServer, lastServerSwitch: Game.lastServerSwitch, main: 'cpu'});

		totalUsage.totalCPU();

	} catch (e) {
		global.Util.logError(e.stack || e.message);
	}
});
