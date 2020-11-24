const Router = require('koa-router');
const rooms = new Router();
const roomsCtrl = require('./rooms.controller');

rooms.get('/', roomsCtrl.getRooms); // 방 목록 조회
rooms.get('/cursor/:endCursor', roomsCtrl.getNextRooms); // 커서 다음방들 조회 12개씩
rooms.patch('/:hostname/profile/thumbnail', roomsCtrl.updateThumbnail); // 방 이미지 DB에 업로드
rooms.get('/:username', roomsCtrl.getUserRoom); // 특정유저의 방 검색
rooms.patch('/:hostname/profile', roomsCtrl.updateProfile); // 방 설정 업데이트

module.exports = rooms;