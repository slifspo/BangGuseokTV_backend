const Router = require('koa-router');
const rooms = new Router();
const roomsCtrl = require('./rooms.controller');

rooms.get('/', roomsCtrl.getRooms); // 방 목록 조회, 한번에 최대 12개씩

module.exports = rooms;