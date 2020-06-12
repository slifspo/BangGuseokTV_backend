const Router = require('koa-router');
const users = new Router();
const usersCtrl = require('./users.controller');

users.post('/register/local', usersCtrl.localRegister); // 로컬 회원가입
users.patch('/profile/username', usersCtrl.updateUsername); // 유저이름 설정
users.patch('/profile/avatar', usersCtrl.updateAvatar); // 아바타 업데이트
users.get('/playlists', usersCtrl.getPlaylists); // 재생목록 가져오기
users.post('/playlists', usersCtrl.addPlaylist); // 새로운 재생목록 추가
users.delete('/playlists', usersCtrl.removePlaylist); // 재생목록에 항목 제거
users.get('/playlists/videos', usersCtrl.getPlaylistVideos); // 재생목록의 동영상 가져오기
users.post('/playlists/videos', usersCtrl.addToPlaylist); // 재생목록에 항목 추가
users.delete('/playlists/videos', usersCtrl.removeFromPlaylist); // 재생목록에 항목 제거
users.patch('/selectedPlaylist', usersCtrl.updateSelectedPlaylist); // 선택된 재생목록 설정

module.exports = users;