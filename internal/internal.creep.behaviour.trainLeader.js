const mod = new Creep.Behaviour('trainLeader');
module.exports = mod;
const super_invalidAction = mod.invalidAction;
mod.invalidAction = function (creep) {
	const attackFlag = global.FlagDir.find(global.FLAG_COLOR.invade.attackTrain, creep.pos, false);
	let hasRangedAttack = creep.hasActiveBodyparts(RANGED_ATTACK);
	if (hasRangedAttack) {
		const targets = creep.pos.findInRange(creep.room.hostiles, 3);
		if (targets.length > 2) {
			if (CHATTY)
				creep.say('MassAttack');
			creep.attackingRanged = creep.rangedMassAttack() === OK;
			return;
		} else {
			creep.attackingRanged = creep.rangedAttack(targets[0]) === OK;
		}
	}
	return super_invalidAction.call(this, creep) ||
		(creep.action.name === 'dismantling' && creep.pos.roomName !== attackFlag.pos.roomName);
};
mod.nextAction = function (creep) {
	const rallyFlag = Game.flags[creep.data.destiny.targetName];
    // global.logSystem(creep.room.name, `rallyFlag: ${global.json(rallyFlag)}`);
    // global.logSystem(creep.room.name, `boosting: ${!creep.data.destiny.boosted || (creep.data.destiny.boosted && !Creep.action.boosting.assign(creep))}`);
	if (!rallyFlag) {
		return this.assignAction(creep, 'recycling');
	} else if (!creep.data.destiny.boosted || (creep.data.destiny.boosted && !Creep.action.boosting.assign(creep))) {
		let attackFlag = global.FlagDir.find(global.FLAG_COLOR.invade.attackTrain, creep.pos, false);
		let dismantleFlag = creep.hasActiveBodyparts(WORK) ? global.FlagDir.find(global.FLAG_COLOR.destroy.dismantle, creep.pos) : global.FlagDir.find(global.FLAG_COLOR.destroy, creep.pos);
		global.logSystem(creep.room.name, `nextAction - attackFlag ${global.json(attackFlag)}`);
		global.logSystem(creep.room.name, `nextAction - dismantleFlag: ${global.json(dismantleFlag)}`);
		global.logSystem(creep.room.name, `nextAction - rallyFlag: ${global.json(rallyFlag)}`);

		Population.registerCreepFlag(creep, rallyFlag);
		const trainLength = Task.train.trainLength(rallyFlag.memory.type) - 1;
		const followers = [];
		for (let i = 1; i < trainLength; i++) {
			const follower = Task.train.findMember(creep, i);
			if (follower)
				followers.push(follower);
		}
		const attackRoom = attackFlag && attackFlag.pos.roomName;
		const rallyRoom = rallyFlag && rallyFlag.pos.roomName;
		const trainAssembled = !_.some(followers, f => f.pos.roomName !== attackRoom && f.pos.roomName !== rallyRoom);

		if (!attackFlag || !trainAssembled || followers.length < trainLength - 1) {
			if (creep.pos.roomName !== rallyRoom) {
				Creep.action.travelling.assignRoom(creep, rallyRoom);
			} else if (creep.pos.getRangeTo(rallyFlag) > 1) {
				this.assignAction(creep, 'travelling', rallyFlag);
			} else {
				this.assignAction(creep, 'idle');
			}
		} else if (creep.pos.roomName !== attackRoom) {
			Creep.action.travelling.assignRoom(creep, attackRoom);
		} else if (dismantleFlag) {
			_.some(creep.body, {'type': WORK}) ? Creep.action.dismantling.assign(creep) : Creep.action.invading.assign(creep);
			global.logSystem(creep.room.name, `creep action: ${Creep.action}`);
		} else if (creep.pos.getRangeTo(attackFlag) > 0) {
			creep.data.travelRange = 0;
			this.assignAction(creep, 'travelling', attackFlag);
			global.logSystem(creep.room.name, `${global.json(creep.data)}`);
		} else {
			this.assignAction(creep, 'idle');
		}
	}
};

mod.selectStrategies = function (actionName) {
	return [mod.strategies.defaultStrategy, mod.strategies[actionName]];
};

mod.strategies = {
	boosting: {
		isValidMineralType: function (mineralType) {
			for (const category in BOOSTS) {
				for (const compound in BOOSTS[category]) {
					if (mineralType === compound) {
						if (!BOOSTS[category][compound].upgradeController) {
							// console.log(compound);
							return true;
						}
					}
				}
			}
			return false;
		},
	},
};
