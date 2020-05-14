const Joi = require('joi');
const Accounts = require('models/account');
const Rooms = require('models/room');

// 로컬 회원가입
exports.localRegister = async (ctx) => {
    // 데이터 검증
    const schema = Joi.object().keys({
        username: Joi.string().regex(/^[a-z|A-Z|0-9]+$/).min(3).max(20).required(), // 영어숫자 3~20자
        email: Joi.string().email().required(),
        password: Joi.string().required().min(6)
    });

    const result = Joi.validate(ctx.request.body, schema);

    if(result.error) {
        ctx.status = 400; // Bad request
        return;
    }

    // 아이디 / 이메일 중복 체크
    let existing = null;
    try {
        existing = await Accounts.findByEmailOrUsername(ctx.request.body);
    } catch (e) {
        ctx.throw(500, e);
    }

    if(existing) {
    // 중복되는 아이디/이메일이 있을 경우
        ctx.status = 409; // Conflict
        // 어떤 값이 중복되었는지 알려줍니다
        ctx.body = {
            key: existing.email.address === ctx.request.body.email ? 'email' : 'username'
        };
        return;
    }

    // 계정 생성
    let account = null;
    try {
        account = await Accounts.localRegister(ctx.request.body);
    } catch (e) {
        ctx.throw(500, e);
    }

    // 방 생성
    let room = null;
    try {
        room = await Rooms.createRoom(account._id);
    } catch (e) {
        ctx.throw(500, e);
    }

    // 계정의 room_id 필드 업데이트
    try {
        await account.update({ 'room_id': room._id });
    } catch (e) {
        ctx.throw(500, e);
    }

    // 인증 메일 전송
    let mail = null;
    try {
        mail = await account.sendMail();
    } catch (e) {
        ctx.throw(500, e);
    }

    // 토큰 생성
    let token = null;
    try {
        token = await account.generateToken();
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
    ctx.body = account.profile; // 프로필 정보로 응답합니다.
};

// 유저이름 설정
exports.updateUsername = async (ctx) => {
    const { user } = ctx.request;

    // 권한 검증
    if(!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저이름이 null일때만 허용
    let account = null;
    try {
        account = await Accounts.findById(user._id);
    } catch (e) {
        ctx.throw(500, e);
    }
    if(account.profile.username !== null){
        ctx.status = 406; // Not allowed
        return;
    }

    // 데이터 검증
    const schema = Joi.object().keys({
        username: Joi.string().regex(/^[a-z|A-Z|0-9]+$/).min(3).max(20).required(), // 영어숫자 3~20자
    });

    const result = Joi.validate(ctx.request.body, schema);

    if(result.error) {
        ctx.status = 400; // Bad request
        return;
    }

    const { username } = ctx.request.body;

    // 중복 체크
    let existing = null;
    try {
        existing = await Accounts.findByUsername(username);
    } catch (e) {
        ctx.throw(500, e);
    }

    if(existing) {
    // 중복되는 유저이름이 있을 경우
        ctx.status = 409; // Conflict
        // 어떤 값이 중복되었는지 알려줍니다
        ctx.body = {
            key: 'username'
        };
        return;
    }

    // 유저이름 변경
    try { // 일치하면 profile.verified 를 true 로 업데이트
        await account.update({ 'profile.username': username });
    } catch (e) {
        ctx.throw(500, e);
    }

    // 바뀐 profile의 토큰을 다시 생성
    let token = null;
    try {
        account = await Accounts.findById(user._id);; // 업데이트된 document 가져옴
        token = await account.generateToken();
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
    ctx.body = account.profile.username; // 유저이름으로 응답.
}
