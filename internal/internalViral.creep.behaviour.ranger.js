let mod = {};
module.exports = mod;
mod.heal = function (creep) {
	if (creep.data.body.heal !== undefined) {
		// Heal myself
		const mustHealSelf = creep.hits < creep.data.hullHits;
		if (mustHealSelf || creep.hits < creep.hitsMax) {
			// Heal self if not attacking or missing combat parts
			if (mustHealSelf || !creep.attacking) {
				creep.target = creep;
				let ret =  creep.heal(creep);
				// global.logSystem(creep.room.name, `HEALING MYSELF: ${creep.name} ret: ${global.Util.translateErrorCode(ret)}`);
				return ret;
			}
		}
		// Heal other
		else if (creep.room.casualties.length > 0) {
			let injured = creep.pos.findInRange(creep.room.casualties, 3);
			if (injured.length > 0) {
				const target = creep.pos.findClosestByRange(injured);
				const canHeal = creep.pos.isNearTo(target) && !mustHealSelf;
				const shouldHeal = target.data && target.hits < target.data.hullHits;
				creep.target = target;
				// Heal other if not attacking or they are badly hurt
				if (canHeal && (shouldHeal || !creep.attacking)) {
					let ret = creep.heal(target);
					// global.logSystem(creep.room.name, `HEALING ANOTHER CREEP: ${creep.name} heals ${target.name} ret: ${global.Util.translateErrorCode(ret)}`);
					return ret;
				} else if (shouldHeal && !(creep.attackingRanged || creep.attacking || mustHealSelf)) {
					let ret = creep.rangedHeal(target);
					// global.logSystem(creep.room.name, `RANGED HEALING ANOTHER CREEP: ${creep.name} heals ${target.name} ret: ${global.Util.translateErrorCode(ret)}`);
					return ret;
				}
			}
		}
	}
};
