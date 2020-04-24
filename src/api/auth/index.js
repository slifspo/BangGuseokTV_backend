const Router = require('koa-router');
const auth = new Router();
const authCtrl = require('./auth.controller');

auth.post('/login/local', authCtrl.localLogin); // 로컬 로그인
auth.get('/exists/:key(email|username)/:value', authCtrl.exists); // 이메일|아이디 존재유무 확인. key 파라미터가 email 이나 username 일때만 허용
auth.post('/logout', authCtrl.logout); // 로그아웃
auth.get('/check', authCtrl.check); // 현재 로그인된 유저의 정보를 알려줌
auth.patch('/verify/email', authCtrl.emailVerify); // 이메일 인증
auth.get('/send/email', authCtrl.emaliSend) // 인증메일 전송
auth.get('/login/facebook', authCtrl.fbLogin) // 페이스북 로그인
auth.get('/login/facebook/callback', authCtrl.fbLoginCb) // 페이스북 로그인 콜백

module.exports = auth;