const Joi = require('joi');
const path = require('path');
const Rooms = require('models/room');
const Accounts = require('models/account');
const fs = require('fs');
const { playState, getTimeLeft, startPlayerlist } = require('lib/playerlist');

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
    const { hostname } = ctx.params;
    const { socketId } = ctx.request.body;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    let account = null
    try {
        account = await Accounts.findOne({
            'profile.username': user.profile.username
        })
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 유저가 재생목록이 있는지, 재생목록에 비디오가 있는지 확인
    const { selectedPlaylist } = account;
    if (account.playlists[selectedPlaylist] === undefined) {
        ctx.status = 400; // 잘못된 요청
        return;
    }
    if (account.playlists[selectedPlaylist].videos[0] === undefined) {
        ctx.status = 400; // 잘못된 요청
        return;
    }

    // playerlist 에 username 추가
    try {
        await Rooms.updateOne(
            {
                'hostname': hostname
            },
            {
                '$addToSet': {
                    'playerlist': {
                        'username': user.profile.username,
                        'socketId': socketId
                    }
                }
            });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // playerlist 시작
    if (playState[hostname] === undefined) // 처음 실행 시
        playState[hostname] = [false, null, '', '', null]; // 초기화
    if (playState[hostname][0] !== true) // 해당 방의 playerlist 가 실행중이 아닐 때 playerlist start
        startPlayerlist(ctx, hostname); // playerlist 시작

    ctx.status = 204; // No contents
};

// playerlist 제거
exports.leavePlayerlist = async (ctx) => {
    const { user } = ctx.request;
    const { hostname } = ctx.params;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // playerlist 에서 제거
    try {
        await Rooms.updateOne(
            {
                'hostname': hostname
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

    // playerlist 에 한명이라도 있는지 확인
    let room = null;
    try {
        room = await Rooms.findOne({
            'hostname': hostname,
        })
    } catch (e) {
        ctx.throw(500, e);
        return;
    }
    if (room.playerlist[0] === undefined) { // playerlist 가 비어있으면
        if (playState[hostname] !== undefined) {
            clearTimeout(playState[hostname][1]); // 타이머 해제
            playState[hostname] = [false, null, '', '', null]; // 초기화
            ctx.io.to(hostname).emit('sendPlayState', { // 클라이언트 playState 초기화
                username: '',
                videoId: '',
                videoDuration: null
            });
        }
    } else { // playerlist 에 유저가 있으면
/*         // 유저가 play 중이었을 시
        if (playState[hostname])
        // 타이머 해제
        clearTimeout(playState[hostname][1]); // 현재 타이머 해제 */

    }

    ctx.status = 204; // No contents
};

// playState 얻기
exports.getPlayState = async (ctx) => {
    const { user } = ctx.request;
    const { hostname } = ctx.params;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 남은시간 얻기
    let timeleft = null;
    if (playState[hostname] && playState[hostname][1]) {
        timeleft = getTimeLeft(playState[hostname][1]);
    }

    // 응답객체
    ctx.body = {
        username: playState[hostname] ? playState[hostname][2] : '',
        videoId: playState[hostname] ? playState[hostname][3] : '',
        videoDuration: playState[hostname] ? playState[hostname][4] : null,
        videoTimeLeft: timeleft
    }
};