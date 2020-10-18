const Router = require('koa-router');
const users = new Router();
const usersCtrl = require('./users.controller');

users.post('/register/local', usersCtrl.localRegister); // 로컬 회원가입

users.get('/profile/:keyword', usersCtrl.searchUsername); // 유저이름 검색
users.patch('/profile/username', usersCtrl.updateUsername); // 유저이름 설정

users.patch('/:username/profile/avatar', usersCtrl.updateAvatar); // 아바타 업데이트

users.get('/:username/playlists', usersCtrl.getPlaylists); // 재생목록 가져오기
users.post('/:username/playlists', usersCtrl.addPlaylist); // 새로운 재생목록 추가
users.delete('/:username/playlists/:playlistIndex', usersCtrl.removePlaylist); // 재생목록에 항목 제거
users.get('/:username/playlists/:playlistIndex/videos', usersCtrl.getPlaylistVideos); // 재생목록의 동영상 가져오기
users.post('/:username/playlists/:playlistIndex/videos', usersCtrl.addToPlaylist); // 재생목록에 항목 추가
users.delete('/:username/playlists/:playlistIndex/videos/:videoIndex', usersCtrl.removeFromPlaylist); // 재생목록에 항목 제거

users.patch('/:username/selectedPlaylist', usersCtrl.updateSelectedPlaylist); // 선택된 재생목록 설정

users.get('/:username/friendlist', usersCtrl.getFriendlist); // 친구목록 조회
users.post('/:username/friendlist', usersCtrl.addFriendlist); // 친구 추가
users.get('/:username/friendlist/:friendname', usersCtrl.getFriend); // 친구 조회
users.delete('/:username/friendlist/:friendname', usersCtrl.deleteFriend); // 친구 삭제

users.get('/:username/sentFriendRequests', usersCtrl.getSentFriendRequests); // 보낸 친구요청 조회
users.post('/:username/sentFriendRequests', usersCtrl.addSentFriendRequests); // 보낸 친구요청 추가
users.delete('/:username/sentFriendRequests/:friendname', usersCtrl.deleteSentFriendRequest); // 보낸 친구요청 제거

users.get('/:username/receivedFriendRequests', usersCtrl.getReceivedFriendRequests); // 받은 친구요청 조회
users.post('/:username/receivedFriendRequests', usersCtrl.addReceivedFriendRequests); // 받은 친구요청 추가
users.delete('/:username/receivedFriendRequests/:friendname', usersCtrl.deleteReceivedFriendRequest); // 받은 친구요청 제거

module.exports = users;