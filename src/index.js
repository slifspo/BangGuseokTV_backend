// .env 파일에서 환경변수 불러오기
require('dotenv').config();

// 모듈 불러오기
const Koa = require('koa');
const Router = require('koa-router');
const IO = require('koa-socket-2');

const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const koaBody = require('koa-body')
const serve = require('koa-static');

const mongoose = require('mongoose');
const path = require('path');
const passport = require('koa-passport');

const { jwtMiddleware } = require('lib/token');
const passportConfig = require('lib/passport');

// 인스턴스 생성
const app = new Koa();
const router = new Router();
const io = new IO();

// API 경로
const api = require('./api');

// Node 의 네이티브 Promise 사용
mongoose.Promise = global.Promise;
// mongodb 연결
mongoose.connect(process.env.MONGO_URI).then(
    (response) => {
        console.log('Successfully connected to mongodb');
    }
).catch(e => {
    console.error(e);
});

// CORS 옵션 설정
let corsOptions = {
    origin: process.env.CLIENT_HOST, // 허락하고자 하는 요청 주소
    credentials: true, // 쿠키나 자격증명 정보를 인식
}

// CORS 허용
app.proxy = true;
app.use(cors(corsOptions));

// public폴더에서 정적 파일 제공
app.use(serve(path.join(__dirname, '../public')));

// formdata parse
app.use(koaBody({
    multipart: true,
    urlencoded: true,
    formidable: {
        maxFileSize: 200 * 1024 * 1024,
        keepExtensions: true // 파일 확장자 유지
    },
    formLimit: '5mb'
}));

// 바디파서 적용, 라우터 적용코드보다 상단에 있어야합니다.
app.use(bodyParser());

// JWT 처리 미들웨어 적용
app.use(jwtMiddleware);

// passport 구동
app.use(passport.initialize());
// passport 설정 
passportConfig();

// socket.io 를 연결
io.attach(app);
// socket event 정의
require('lib/socket').init(io);

// api 라우트를 ./api 경로 하위 라우트로 설정
router.use('/api', api.routes()); 
app.use(router.routes())
app.use(router.allowedMethods());

// PORT 값이 설정되어있지 않다면 4000 을 사용합니다.
const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
    console.log('bgs server is listening to port ' + port);
});

module.exports = server;