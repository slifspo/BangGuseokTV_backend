const Router = require('koa-router');

const api = new Router();
const auth = require('./auth');
const users = require('./users');

api.use('/auth', auth.routes()); // 인증
api.use('/users', users.routes()); // 유저

module.exports = api;