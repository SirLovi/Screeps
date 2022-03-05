const mod = {

    extend() {
        this.baseOf.internalViral.extend.call(this);

        Room.prototype.checkPowerBank = function() {
            if (!this.powerBank) return; // no power bank in room
            if (this.powerBank.cloak) return;
            const currentFlags = global.FlagDir.count(global.FLAG_COLOR.invade.powerMining, this.powerBank.pos, false);
            const flagged = global.FlagDir.find(global.FLAG_COLOR.invade.powerMining, this.powerBank.pos, true);
            const valid = Room.findSpawnRoom({targetRoom: this.name, maxRange: global.OBSERVER_OBSERVE_RANGE, minRCL: global.Task.powerMining.minControllerLevel}) || false;
            if (valid && !flagged && currentFlags < global.MAX_AUTO_POWER_MINING_FLAGS) {
                if (this.powerBank.power > 2500 && this.powerBank.ticksToDecay > 4500) {
                    this.powerBank.pos.newFlag(global.FLAG_COLOR.invade.powerMining, this.name + '-PM');
                }
            }
        };
    },

    analyzeRoom(room, needMemoryResync) {
        this.baseOf.internalViral.analyzeRoom.call(this, ...arguments);

        if (global.AUTO_POWER_MINING) room.checkPowerBank();
    }

};
module.exports = mod;
