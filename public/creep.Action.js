// base class for every action
let Action = function (actionName) {
	// action name
	this.name = actionName;
	// max allowed creeps per target
	this.maxPerTarget = Infinity;
	// max allowed creeps per action (and room)
	this.maxPerAction = Infinity;
	// range within which the action can be executed (e.g. upgrade controller = 3)
	this.targetRange = 1;
	// range until which the target has been reached. (e.g. can be less than targetRange)
	this.reachedRange = 1;
	// if true, will try to find new target if a target has become invalid
	// if false, an invalid target wil invalidate the action as well (causing to get a new action)
	this.renewTarget = true;
	// get unique identifier of any object (id or name)
	this.getTargetId = function (target) {
		return target.id || target.name;
	};
	// get an object by its unique identifier (id or name)
	this.getTargetById = function (id) {
		return Game.getObjectById(id) || Game.spawns[id] || Game.flags[id];
	};
	// determines, if an action is (still) valid. Gets validated each tick.
	// check possible override in derived action
	this.isValidAction = function (creep) {
		return true;
	};
	// determines, if a target is (still) valid. Gets validated each tick.
	// check possible override in derived action
	this.isValidTarget = function (target, creep) {
		return (target != null);
	};
	// determines, if an action is valid. Gets validated only once upon assignment.
	// check possible override in derived action
	this.isAddableAction = function (creep) {
		return (this.maxPerAction === Infinity || !creep.room.population || !creep.room.population.actionCount[this.name] || creep.room.population.actionCount[this.name] < this.maxPerAction);
	};
	// determines, if a target is valid. Gets validated only once upon assignment.
	// check possible override in derived action
	this.isAddableTarget = function (target, creep) { // target is valid to be given to an additional creep
		let ret = (!target.targetOf || this.maxPerTarget === Infinity || _.filter(target.targetOf, {'actionName': this.name}).length < this.maxPerTarget);

		if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name))
			global.logSystem(creep.room.name, `${creep.name} WARRIOR: selecting new target isAddable: ${ret}`);


		return ret;
	};
	// find a new target for that action
	// needs implementation in derived action
	this.newTarget = function (creep) {
		// global.logSystem(creep.room.name, `${creep.name} RENEWING: new target, action: ${creep.action}`);
		return null;
	};
	this.unassign = function (creep) {
		delete creep.data.actionName;
		delete creep.data.targetId;
		delete creep.action;
		delete creep.target;
	};
	// order for the creep to execute each tick, when assigned to that action
	this.step = function (creep) {
		if (global.CHATTY) creep.say(this.name, global.SAY_PUBLIC);
		let range = creep.pos.getRangeTo(creep.target);
		if (range <= this.targetRange) {
			let workResult = this.work(creep);
			if (workResult !== OK) {
				creep.handleError({errorCode: workResult, action: this, target: creep.target, range, creep});
				return this.unassign(creep);
			}
			range = creep.pos.getRangeTo(creep.target); // target may have changed (eg. hauler feed+move/tick)
		}
		if (creep.target && creep.hasActiveBodyparts(MOVE)) {
			if (range > this.targetRange) creep.travelTo(creep.target, {range: this.targetRange});
			// low CPU pathfinding for last few steps.
			else if (range > this.reachedRange) {
				const direction = creep.pos.getDirectionTo(creep.target);
				const targetPos = Traveler.positionAtDirection(creep.pos, direction);
				if (creep.room.isWalkable(targetPos.x, targetPos.y)) { // low cost last steps if possible
					creep.move(direction);
				} else if (!creep.pos.isNearTo(creep.target)) { // travel there if we're not already adjacent
					creep.travelTo(creep.target, {range: this.reachedRange});
				}
			}
		}
	};
	// order for the creep to execute when at target
	this.work = function (creep) {
		return ERR_INVALID_ARGS;
	};
	// validate, if this action is still valid for a certain creep and target
	// returns the target (could be a ne one) if valid or null
	this.validateActionTarget = function (creep, target) {
		if (this.isValidAction(creep)) { // validate target or new
			if (!this.isValidTarget(target, creep)) {
				if (this.renewTarget) { // invalid. try to find a new one...
					delete creep.data.path;
					return this.newTarget(creep);
				}
			} else return target;
		}
		return null;
	};
	// assign the action to a creep
	// optionally predefine a fixed target
	this.assign = function (creep, target) {
		if (target === undefined) {

			target = this.newTarget(creep);

			// if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name) && creep.data.creepType === 'warrior')
			// 	global.logSystem(creep.room.name, `${creep.name} WARRIOR: selecting new target: ${target} this.name: ${this.name}`);

			if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name)
				&& this.name === 'renewing'
				&& (creep.data.creepType === 'hauler' || creep.data.creepType === 'remoteHauler' || creep.data.creepType === 'worker')) {
				global.logSystem(creep.room.name, `${creep.name} RENEWING: selecting new target: ${target} this.name: ${this.name}`);
			}

		} else {
			// if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name) && creep.data.creepType === 'warrior')
			// 	global.logSystem(creep.room.name, `${creep.name} WARRIOR: already has target: ${target}`);

			if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name)
				&& this.name === 'renewing'
				&& (creep.data.creepType === 'hauler' || creep.data.creepType === 'remoteHauler' || creep.data.creepType === 'worker')) {
				global.logSystem(creep.room.name, `${creep.name} RENEWING: already has target: ${target} this.name: ${this.name}`);
			}


		}

		// if (target === undefined) {
		// 	target = this.nextOtherAction(creep);
		// }

		let isAddable;

		if (target)
			isAddable = this.isAddableTarget(target, creep);
		else
			isAddable = false;

		// if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name) && creep.data.creepType === 'warrior')
		// 	global.logSystem(creep.room.name, `${creep.name} WARRIOR: addable action ${isAddable} target: ${target}`);

		if (target && isAddable) {

			// if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name) && creep.data.creepType === 'warrior') {
			// 	global.logSystem(creep.room.name, `${creep.name}, WARRIOR: assign: OK`);
			// 	// trace is not working
			// 	global.Util.trace('Action', {creepName: creep.name, assign: this.name, target: !target || target.name || target.id, Action: 'assign'});
			// }
			if (global.DEBUG && global.TRACE)
				global.Util.trace('Action', {creepName: creep.name, assign: this.name, target: !target || target.name || target.id, Action: 'assign'});

			// if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name) && creep.data.creepType === 'warrior')
			// 	global.logSystem(creep.room.name, `${creep.name} action: ${!creep.action || creep.action.name !== this.name} target: ${!creep.target || creep.target.id !== target.id || creep.target.name !== target.name}`);

			if (!creep.action || creep.action.name !== this.name || !creep.target || creep.target.id !== target.id || creep.target.name !== target.name) {
				// if (global.DEBUG && global.debugger(global.DEBUGGING.warrior, creep.room.name) && creep.data.creepType === 'warrior'){
				// 	global.logSystem(creep.room.name, `${creep.name}, WARRIOR: Population.registerAction`);
				// }
				if (global.DEBUG && global.debugger(global.DEBUGGING.renewing, creep.room.name) && this.name === 'renewing'
					&& (creep.data.creepType === 'hauler' || creep.data.creepType === 'remoteHauler' || creep.data.creepType === 'worker')) {

					global.logSystem(creep.room.name, `${creep.name}, RENEWING: Population.registerAction -> target: ${target}`);

				}


				global.Population.registerAction(creep, this, target);
				this.onAssignment(creep, target);
			}
			return true;
		}
		return false;
	};
	this.showAssignment = function (creep, target) {
		if (global.SAY_ASSIGNMENT && ACTION_SAY[this.name.toUpperCase()]) creep.say(ACTION_SAY[this.name.toUpperCase()], global.SAY_PUBLIC);
		if (target instanceof RoomObject || target instanceof RoomPosition && VISUALS.ACTION_ASSIGNMENT) {
			Visuals.drawArrow(creep, target);
		}
	};
	// assignment postprocessing
	this.onAssignment = function (creep, target) {
		this.showAssignment(creep, target);
	};
	// empty default strategy
	this.defaultStrategy = {
		name: `default-${actionName}`,
		moveOptions: function (options) {
			return options || {};
		},
	};
	// strategy accessor
	this.selectStrategies = function () {
		return [this.defaultStrategy];
	};
	// get member with this action's name
	this.isMember = function (collection) {
		return _.find(collection, function (a) {
			return a.name === this.name;
		}, this);
	};
	this.getStrategy = function (strategyName, creep, ...args) {
		if (_.isUndefined(args))
			return creep.getStrategyHandler([this.name], strategyName);
		else
			return creep.getStrategyHandler([this.name], strategyName, ...args);
	};
	this.lootFilter = function (loots, creep) {

		if (loots.length === 0)
			return false;

		let filter;
		if (creep.room.my && creep.room.situation.invasion) {
			// pickup near sources only
			filter = (loot) => creep.pos.findInRange(loot, 1).length > 0;

		}

		// else if (creep.data.creepType === 'remoteHauler') {
		// 	filter = (loot) => creep.pos.findInRange(loot, 3).length > 0;
		// } else
		// 	filter = (loot) => true;


		return creep.pos.findClosestByPath(loots, {filter: filter});

	};
};
module.exports = Action;
