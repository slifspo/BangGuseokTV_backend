const Router = require('koa-router');
const users = new Router();
const usersCtrl = require('./users.controller');

users.post('/register/local', usersCtrl.localRegister); // 로컬 회원가입
users.patch('/profile/username', usersCtrl.updateUsername); // 유저이름 설정
users.patch('/profile/avatar', usersCtrl.updateAvatar); // 아바타 업데이트
users.post('/profile/playlists/videos', usersCtrl.addToPlaylist); // 재생목록에 항목 추가
users.get('/profile/playlists', usersCtrl.getPlaylists); // 재생목록 가져오기
users.get('/profile/playlists/videos', usersCtrl.getPlaylistVideos); // 재생목록의 동영상 가져오기

module.exports = users;