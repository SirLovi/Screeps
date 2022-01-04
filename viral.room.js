"use strict";

let viralRoom = {};

viralRoom.validFields = function (roomName, minX, maxX, minY, maxY, checkWalkable = false, where = null) {
    const
        room = Game.rooms[roomName],
        look = checkWalkable ? room.lookAtArea(minY, minX, maxY, maxX) : null;

    let fields = [];

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            if (x >= 1 && x <= 48 && y >= 1 && y <= 48) {
                if (!checkWalkable || room.isWalkable(x, y, look)) {
                    let p = new RoomPosition(x, y, roomName);
                    if (!where || where(p))
                        fields.push(p);
                }
            }
        }
    }
    return fields;
};

module.exports = viralRoom;

