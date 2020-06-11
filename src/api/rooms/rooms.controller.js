const Joi = require('joi');
const path = require('path');
const Rooms = require('models/room');
const Accounts = require('models/account');
const fs = require('fs');

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

// 방 이미지 DB에 업로드
exports.updateThumbnail = async (ctx) => {
    const { user } = ctx.request;

    // 권한 검증
    if (!user) {
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
    let room = null;
    try {
        room = await Rooms.findByUserId(user._id);
    } catch {
        ctx.throw(500, e);
        return;
    }

    // thumbnail 업데이트
    const imgData = fs.readFileSync(file.path);
    const contentType = file.type;
    try {
        await room.update({
            'profile.thumbnail.data': imgData,
            'profile.thumbnail.contentType': contentType
        });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No contents
};

// 방 이미지 검색
exports.getUserRoom = async (ctx) => {
    const { user } = ctx.request;
    const { username } = ctx.params;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 해당하는 유저인지 확인
    if (user.profile.username !== username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 해당 유저의 방 찾기
    let room = null;
    try {
        room = await Rooms.findByUserId(user._id);
    } catch {
        ctx.throw(500, e);
        return;
    }

    ctx.body = room
};

// 방 설정 업데이트
exports.updateProfile = async (ctx) => {
    const { user } = ctx.request;
    const { roomTitle, roomExplain } = ctx.request.body;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 해당 유저의 방 찾기
    let room = null;
    try {
        room = await Rooms.findByUserId(user._id);
    } catch {
        ctx.throw(500, e);
        return;
    }

    // title, description 업데이트
    try {
        await room.update({
            'profile.title': roomTitle,
            'profile.description': roomExplain
        });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No contents
};

// playerlist 추가
exports.joinPlayerlist = async (ctx) => {
    const { user } = ctx.request;
    const { hostname } = ctx.request.body;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // hostname 으로 해당 방 찾기
    let account = null;
    try {
        account = await Accounts.findOne({ 'profile.username': hostname });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // playerlist 에 username 추가
    try {
        await Rooms.update(
            {
                '_id': account.room_id
            },
            {
                '$push': {
                    'playerlist': {
                        'username': user.profile.username
                    }
                }
            });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No contents
};

// playerlist 제거
exports.leavePlayerlist = async (ctx) => {
    const { user } = ctx.request;
    const { hostname } = ctx.query;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // hostname 으로 해당 방 찾기
    let account = null;
    try {
        account = await Accounts.findOne({ 'profile.username': hostname });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // playerlist 에서 username 제거
    try {
        await Rooms.update(
            {
                '_id': account.room_id,
            },
            {
                '$pull': {
                    'playerlist': {
                        'username': user.profile.username
                    }
                }
            }
        );
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No contents
};