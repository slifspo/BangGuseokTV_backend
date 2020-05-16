const Router = require('koa-router');
const users = new Router();
const usersCtrl = require('./users.controller');

users.post('/register/local', usersCtrl.localRegister); // 로컬 회원가입
users.patch('/profile/username', usersCtrl.updateUsername); // 유저이름 설정
users.patch('/profile/avatar', usersCtrl.updateAvatar); // 아바타 업데이트

module.exports = users;