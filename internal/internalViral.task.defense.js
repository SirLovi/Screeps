let mod = {};
module.exports = mod;
mod.creep = {
    defender: {
        fixedBody: [ATTACK, MOVE],
        multiBody: [TOUGH, ATTACK, RANGED_ATTACK, HEAL, MOVE, MOVE, MOVE, MOVE],
        name: "defender",
        behaviour: "warrior",
        queue: 'High',
        sort: (a, b) => {
            const partsOrder = [TOUGH, ATTACK, MOVE, RANGED_ATTACK, HEAL];
            const indexOfA = partsOrder.indexOf(a);
            const indexOfB = partsOrder.indexOf(b);
            return indexOfA - indexOfB;
        },
        maxRange: 5,
    },
};
