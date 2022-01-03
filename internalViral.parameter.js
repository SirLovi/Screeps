global._ME = _(Game.rooms).map('controller').filter('my').map('owner.username').first();
let mod = {
    FILL_NUKER: false,
    CONTROLLER_SIGN: true,
    CONTROLLER_SIGN_MESSAGE: `𝔊𝔯𝔢𝔢𝔱𝔦𝔫𝔤𝔰 𝔗𝔯𝔞𝔳𝔢𝔩𝔢𝔯! 𝔚𝔬𝔲𝔩𝔡 𝔶𝔬𝔲 𝔨𝔦𝔫𝔡𝔩𝔶 𝔰𝔱𝔞𝔶 𝔞𝔴𝔞𝔶?`,
    AUTO_POWER_MINING: false, //set to false to disable power mining (recomended until 1-2 RCL8+ rooms)
    MAX_AUTO_POWER_MINING_FLAGS: 2,
    ACTION_SAY: {
        HARVESTPOWER: String.fromCodePoint(0x26CF),
    },
    POWER_MINE_LOG: true, //displays power mining info in console
};
module.exports = mod;
