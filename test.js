'use strict';

let mod = {
	analyze() {
		this.testLabTech();
	},
	testLabTech () {

		// for (const [creep, data] of Object.entries(Memory.population)) {
		// 	if(data.creepType === 'labTech' && data.lastAction === 'storing') {
		// 		global.logSystem(data.roomName, `name: ${data.creepName} action: ${data.lastAction}`);
		// 	}
		// }

		// if (Game.time % 2 === 0) {
		// 	let creep = Game.creeps['labTech-Flag94-1'];
		// 	if (creep) {
		// 		console.log(`creep: ${creep.name}`);
		// 		// console.log('Explain');
		// 		// let ret = creep.explain();
		// 		// global.logSystem(creep.room.name, `${ret}`);
		// 		console.log('JSON');
		// 		console.log(global.json(creep.data));
		// 		console.log(creep.explainAgent());
		//
		// 	} else {
		// 		console.log(`no creeps found`);
		// 	}
		// }

		// Util.data('labTech-Flag94-1')


	}
}
module.exports = mod;
