const mod = {};
module.exports = mod;

mod.extend = function () {

	this.baseOf.internalViral.extend.call(this);

	StructureNuker.prototype.getNeeds = function (resourceType) {
		// if parameter is enabled then autofill nukers
		if (global.FILL_NUKER) {
			if (resourceType === RESOURCE_ENERGY && this.store[RESOURCE_ENERGY] < this.store.getCapacity(RESOURCE_ENERGY)) {
				return this.store.getCapacity(RESOURCE_ENERGY) - this.store[RESOURCE_ENERGY];
			}
			if (resourceType === RESOURCE_GHODIUM && this.store[RESOURCE_GHODIUM] < this.store.getCapacity(RESOURCE_GHODIUM)) {
				return this.store.getCapacity(RESOURCE_GHODIUM) - this.store[RESOURCE_GHODIUM];
			}
			return 0;
		}

		let room = this.room;
		let nuker = room.structures.nukers.all[0];

		global.logSystem(room.name, `NUKER: ${nuker}`);


		if (!room.memory.resources)
			return 0;

		if (!room.memory.resources.nuker) {
			room.memory.resources.nuker = [];
			room.memory.resources.nuker.push({
				id: nuker.id,
				orders: []
			})
		}

		let loadTarget = 0;
		let unloadTarget = 0;

		// look up resource and calculate needs
		let containerData = room.memory.resources.nuker.find((s) => s.id === this.id);
		if (containerData) {
			let order = containerData.orders.find((o) => {
				return o.type === resourceType;
			});
			if (order) {
				let amt = 0;
				if (resourceType === RESOURCE_ENERGY)
					amt = this.store[RESOURCE_ENERGY];
				else if (resourceType === RESOURCE_GHODIUM)
					amt = this.store[RESOURCE_GHODIUM];
				loadTarget = Math.max(order.orderRemaining + amt, order.storeAmount);
				unloadTarget = order.orderAmount + order.storeAmount;
				if (unloadTarget < 0)
					unloadTarget = 0;
			}
		}
		let store = 0;
		let space = 0;
		if (resourceType === RESOURCE_ENERGY) {
			store = this.store[RESOURCE_ENERGY];
			space = this.store.getCapacity(RESOURCE_ENERGY) - store;
		} else if (resourceType === RESOURCE_GHODIUM) {
			store = this.store[RESOURCE_GHODIUM];
			space = this.store.getCapacity(RESOURCE_GHODIUM) - store;
		}
		if (store < loadTarget)
			return Math.min(loadTarget - store, space);
		if (store > unloadTarget * 1.05)
			return unloadTarget - store;

		return 0;
	};
};
