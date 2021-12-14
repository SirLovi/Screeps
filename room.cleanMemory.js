'use strict';

let mod = {
	analyze() {
		this.cleanRoomMemory();
	},
	cleanRoomMemory () {
		if (global.CLEAN_ROOM_MEMORY.enabled && Game.time % global.CLEAN_ROOM_MEMORY.timing === 0) {
			console.log(`Cleaning rooms memory`);
			Util.clearRoomMemory();
		}
	}
}
module.exports = mod;
