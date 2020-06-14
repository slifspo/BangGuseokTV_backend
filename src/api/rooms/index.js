const Router = require('koa-router');
const rooms = new Router();
const roomsCtrl = require('./rooms.controller');

rooms.get('/', roomsCtrl.getRooms); // 방 목록 조회, 한번에 최대 12개씩
rooms.patch('/profile/thumbnail', roomsCtrl.updateThumbnail); // 방 이미지 DB에 업로드
rooms.get('/:username', roomsCtrl.getUserRoom); // 방 이미지 검색
rooms.patch('/profile', roomsCtrl.updateProfile); // 방 설정 업데이트
rooms.post('/:hostname/playerlist', roomsCtrl.joinPlayerlist); // playerlist 추가
rooms.delete('/:hostname/playerlist', roomsCtrl.leavePlayerlist); // playerlist 제거
rooms.get('/:hostname/playstate', roomsCtrl.getPlayState); // playState 얻기
rooms.get('/:hostname/timeleft', roomsCtrl.getTimeLeft); // 동영상 남은시간 얻기

module.exports = rooms;