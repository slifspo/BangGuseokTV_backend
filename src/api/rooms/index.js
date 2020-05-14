const Router = require('koa-router');
const rooms = new Router();
const roomsCtrl = require('./rooms.controller');

rooms.get('/', roomsCtrl.getRooms); // 방 목록 조회, 한번에 최대 12개씩
rooms.patch('/profile/thumbnail', roomsCtrl.updateThumbnail); // 이미지 업로드, thumbnail 경로 수정

module.exports = rooms;