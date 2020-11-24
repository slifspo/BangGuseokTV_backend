const Joi = require('joi');
const path = require('path');
const Rooms = require('models/room');
const Accounts = require('models/account');
const fs = require('fs');
const { playState, getTimeLeft, startPlayerlist } = require('lib/playerlist');

// 방 목록 조회
exports.getRooms = async (ctx) => {
    const { user } = ctx.request;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 방 조회
    const rooms = await Rooms.getRooms();

    if (rooms === null) {
        ctx.status = 200;
        return;
    }

    ctx.body = rooms;
};

// 커서 다음방들 조회 12개씩
exports.getNextRooms = async (ctx) => {
    const { user } = ctx.request;
    const { endCursor } = ctx.params;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 방 조회
    const rooms = await Rooms.getRooms();

    if (rooms === null) {
        ctx.status = 200;
        return;
    }

    let result = [];

    const start = +endCursor + 1;
    if (start < rooms.length) { // rooms 개수보다 적다면
        const end = +start + 12;
        if (end < rooms.length) {
            result = rooms.slice(start, end);
        } else {
            result = rooms.slice(start);
        }
    }

    ctx.body = result;
};

// 방 이미지 DB에 업로드
exports.updateThumbnail = async (ctx) => {
    const { user } = ctx.request;
    const { hostname } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != hostname) {
        ctx.status = 403; // Forbidden
        return;
    }

    //const date = moment().format('YYYYMMDDHHmmss')
    const file = ctx.request.files.file;
    const ext = path.extname(file.path);

    // 확장자가 없는경우 + 파일 type 검사하기도 추가하기
    if (ext === '') {
        ctx.status = 406; // Not allowed type
        return;
    }

    // 해당 유저의 방 찾기
    const room = await Rooms.findByUserId(user._id);

    // thumbnail 업데이트
    const imgData = fs.readFileSync(file.path);
    const contentType = file.type;

    await room.update({
        'profile.thumbnail.data': imgData,
        'profile.thumbnail.contentType': contentType
    });

    ctx.status = 204 // No Content;
};

// 특정유저의 방 검색
exports.getUserRoom = async (ctx) => {
    const { user } = ctx.request;
    const { username } = ctx.params;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 특정유저의 방 찾기
    const room = await Rooms.findByHostname(username);

    ctx.body = room
};

// 방 설정 업데이트
exports.updateProfile = async (ctx) => {
    const { user } = ctx.request;
    const { hostname } = ctx.params;
    const { roomTitle, roomExplain } = ctx.request.body;

    // 권한 검증
    if (!user || user.profile.username != hostname) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 해당 유저의 방 찾기
    const room = await Rooms.findByUserId(user._id);

    // title, description 업데이트
    await room.update({
        'profile.title': roomTitle,
        'profile.description': roomExplain
    });

    ctx.status = 204 // No Content;
};