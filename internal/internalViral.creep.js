const mod = {};
module.exports = mod;
mod.compileBody = function (room, params, spawn = false, sort = true) {

	console.log(`compileBody params: ${global.json(params)}`);

	const moveRatio = 1 - (_.isNumber(params.moveRatio) && params.moveRatio > 0) ? params.moveRatio : 0.5;
	const parts = this.baseOf.internalViral.compileBody.apply(this, [room, params, sort]);
	if (!sort) {
		return parts;
	}
	const attackCount = _.sum(parts, p => p === ATTACK);
	const rangedCount = _.sum(parts, p => p === RANGED_ATTACK);
	const hasTough = _.some(parts, p => p === TOUGH);
	const moveCount = _.sum(parts, p => p === MOVE);
	const partsSize = _.sum(parts, p => p !== CARRY);
	if (params.moveRatio !== undefined || (attackCount || hasTough) && moveCount * 2 >= partsSize && attackCount >= rangedCount) {
		// relocate move parts as armor so that 2:1 move when hits === hullHits
		const movedMoves = parts.splice(_.findIndex(parts, p => p === MOVE),
			Math.floor(moveRatio * moveCount));
		const insertIndex = Math.max(0,
			_.findIndex(parts, p => !global.Population.stats.creep.armorParts[p]),
			_.findIndex(parts, p => p !== TOUGH)); // drainer case
		parts.splice(insertIndex, 0, ...movedMoves);
	}

	if (parts.length > 9 && parts[parts.length - 1] === HEAL && parts[parts.length - 2] === TOUGH) {
		parts.splice(parts.length - 2, 0);
		parts.push(MOVE);
	}

	console.log(`compile parts for INTERNAL ${params.name}, length: ${parts.length}`);
	// if (parts.length >= 50)
	// 	global.logSystem(room.name, `compile parts ${parts.length}`);

	return parts;
};
