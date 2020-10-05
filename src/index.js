require('dotenv').config(); // .env 파일에서 환경변수 불러오기

const Koa = require('koa');
const IO = require('koa-socket-2');
const cors = require('@koa/cors');
const Router = require('koa-router');

const app = new Koa();
const io = new IO();

const router = new Router();
const api = require('./api');

const mongoose = require('mongoose');
const bodyParser = require('koa-bodyparser');
const { jwtMiddleware } = require('lib/token');

const passport = require('koa-passport');
const passportConfig = require('lib/passport');

const koaBody = require('koa-body')
const serve = require('koa-static');
const path = require('path');

mongoose.Promise = global.Promise; // Node 의 네이티브 Promise 사용
// mongodb 연결
mongoose.connect(process.env.MONGO_URI).then(
    (response) => {
        console.log('Successfully connected to mongodb');
    }
).catch(e => {
    console.error(e);
});

const port = process.env.PORT || 4000; // PORT 값이 설정되어있지 않다면 4000 을 사용합니다.

let corsOptions = {
    origin: true, // 허락하고자 하는 요청 주소
    credentials: true
} 
app.use(cors(corsOptions)); // CORS 허용

app.use(serve(path.join(__dirname, '../public'))); // public폴더에서 정적 파일 제공

app.use(koaBody({ // formdata parse
    multipart: true,
    urlencoded: true,
    formidable: {
        maxFileSize: 200 * 1024 * 1024,
        keepExtensions: true // 파일 확장자 유지
    },
    formLimit: '5mb'
}));
app.use(bodyParser()); // 바디파서 적용, 라우터 적용코드보다 상단에 있어야합니다.
app.use(jwtMiddleware); // JWT 처리 미들웨어 적용

app.use(passport.initialize()); // passport 구동
passportConfig();

io.attach(app); // socket.io
require('lib/socket').init(io); // socket event 정의
app.context.io = io; // context(ctx) 에 io를 attach

router.use('/api', api.routes()); // api 라우트를 /api 경로 하위 라우트로 설정
app.use(router.routes())
app.use(router.allowedMethods());

app.listen(port, () => {
    console.log('bgs server is listening to port ' + port);
});