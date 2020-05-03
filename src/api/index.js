const Router = require('koa-router');

const api = new Router();
const auth = require('./auth');
const users = require('./users');
const rooms = require('./rooms');

api.use('/auth', auth.routes()); // 인증
api.use('/users', users.routes()); // 유저
api.use('/rooms', rooms.routes()); // 방

module.exports = api;