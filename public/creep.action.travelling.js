let action = new Creep.Action('travelling');
module.exports = action;
action.isValidTarget = function (target) {
	return target !== null;
};
action.isAddableAction = function () {
	return true;
};
action.isAddableTarget = function () {
	return true;
};
action.newTarget = function (creep) {
	// TODO trace it: console.log(creep.strategy([action.name]).key);
	return creep.getStrategyHandler([action.name], 'newTarget', creep);
};
action.step = function (creep) {
	if (global.CHATTY) creep.say(this.name, global.SAY_PUBLIC);
	let targetRange = _.get(creep, ['data', 'travelRange'], this.targetRange);
	let target = creep.target;
	if (FlagDir.isSpecialFlag(creep.target)) {
		if (creep.data.travelRoom) {
			const room = Game.rooms[creep.data.travelRoom];
			if (room && (room.name === creep.pos.roomName)) { // TODO || room.getBorder(creep.pos.roomName))) {
				creep.leaveBorder(); // TODO unregister / return false? and immediately acquire new action & target
				target = null;
			} else {
				targetRange = _.get(creep, ['data', 'travelRange'], TRAVELLING_BORDER_RANGE || 22);
				target = new RoomPosition(25, 25, creep.data.travelRoom);
			}
		} else {
			logError(creep.name + 'Creep.action.travelling called with specialFlag target and travelRoom undefined.');
			target = null;
		}
	}
	if (target) {
		const range = creep.pos.getRangeTo(target);
		if (range <= targetRange) {
			return action.unregister(creep);
		} else if (targetRange === 0 && creep.pos.isNearTo(target)) {
			if (target.pos.lookFor(LOOK_CREEPS).length > 0) {
				// avoid trying to pathfind to a blocked location
				if (DEBUG) logSystem(creep.name, 'travelling.step: destination blocked, stopping.');
				return action.unregister(creep);
			}
		}
		// TODO: Only check if moving towards the rampart
		if (!!creep.room.owner && creep.room.owner !== ME && Task.reputation.isAlly(creep.room.owner) && _.find(creep.pos.adjacent, pos => {
			return _.find(pos.lookFor(LOOK_STRUCTURES), s => {
				return s instanceof StructureRampart && Task.reputation.allyOwner(s);
			});
		})) {
			creep.say(String.fromCodePoint(0x1f44b) + String.fromCodePoint(0x1f3fe) + String.fromCodePoint(0x1F6AA) + String.fromCodePoint(0x1f510), true);
		}
		if (creep.data.creepType !== 'sourceKiller') {
			creep.travelTo(target, {range: targetRange, ignoreCreeps: creep.data.ignoreCreeps || true, avoidSKCreeps: false});
		} else {
			creep.travelTo(target, {range: targetRange, ignoreCreeps: creep.data.ignoreCreeps || true, avoidSKCreeps: true});
		}
	} else {
		action.unregister(creep);
	}
};
action.assignRoom = function (creep, roomName) {
	if (!roomName) {
		global.Util.logError(creep.name + 'Creep.action.travelling.assignRoom called with no room.');
		return;
	}
	if (_.isUndefined(creep.data.travelRange))
		creep.data.travelRange = global.TRAVELLING_BORDER_RANGE || 22;
	creep.data.travelRoom = roomName;
	if (global.DEBUG && global.TRACE)
		global.trace('Action', {creepName: creep.name, assign: this.name, roomName, Action: 'assign'});
	return Creep.action.travelling.assign(creep, global.FlagDir.specialFlag());
};
action.unregister = function (creep) {
	delete creep.action;
	delete creep.target;
	delete creep.data.actionName;
	delete creep.data.ignoreCreeps;
	delete creep.data.targetId;
	delete creep.data.travelRoom;
	delete creep.data.travelRange;
};
action.defaultStrategy.newTarget = function (creep) {
	if (creep.data.travelPos || creep.data.travelRoom) {
		return FlagDir.specialFlag();
	}
	return null;
};
