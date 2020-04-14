const Router = require('koa-router');
const users = new Router();
const usersCtrl = require('./users.controller');

users.post('/register/local', usersCtrl.localRegister); // 로컬 회원가입

module.exports = users;