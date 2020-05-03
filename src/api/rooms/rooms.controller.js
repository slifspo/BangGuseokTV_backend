const Joi = require('joi');
const Rooms = require('models/room');

// 방 목록 조회, 한번에 최대 12개씩
exports.getRooms = async (ctx) => {
    const { user } = ctx.request;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 방 조회
    let rooms = null;
    try {
        rooms = await Rooms.getRooms();
    } catch (e) {
        ctx.throw(500, e);
    }

    if (rooms === null) {
        ctx.status = 204 // No contents
        return;
    }

    ctx.body = rooms;
};