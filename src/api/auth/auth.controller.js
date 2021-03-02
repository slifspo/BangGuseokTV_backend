const Joi = require('joi');
const Accounts = require('models/account');
const Rooms = require('models/room');
const passport = require('koa-passport');
const { setTokenToCookie } = require('lib/token');

// 로컬 회원가입
exports.localRegister = async (ctx) => {
    // 데이터 검증
    const schema = Joi.object().keys({
        username: Joi.string().regex(/^[a-z|A-Z|0-9]+$/).min(3).max(20).required(), // 영어숫자 3~20자
        email: Joi.string().email().required(),
        password: Joi.string().required().min(6)
    });

    const result = Joi.validate(ctx.request.body, schema);

    if (result.error) {
        ctx.status = 400; // Bad request
        return;
    }

    // 아이디 / 이메일 중복 체크
    const existing = await Accounts.findByEmailOrUsername(ctx.request.body);

    if (existing) {
        // 중복되는 아이디/이메일이 있을 경우
        ctx.status = 409; // Conflict
        // 어떤 값이 중복되었는지 알려줍니다
        ctx.body = {
            key: existing.email.address === ctx.request.body.email ? 'email' : 'username'
        };
        return;
    }

    // 계정 생성
    const account = await Accounts.localRegister(ctx.request.body);

    // 방 생성
    const room = await Rooms.createRoom(account._id);

    // 방의 hostname 변경
    await Rooms.updateOne(
        {
            'host_id': account._id
        },
        {
            '$set': {
                'hostname': ctx.request.body.username
            }
        }
    );

    // 계정의 room_id 필드 업데이트
    await account.update({ 'room_id': room._id });

    // 인증 메일 전송
    await account.sendMail();

    // 토큰 생성
    const token = await account.generateToken();

    // 토큰을 쿠키에 저장
    setTokenToCookie(ctx, token);

    // 프로필 정보로 응답합니다.
    ctx.body = account.profile;
};

// 로컬 로그인
exports.localLogin = async (ctx) => {
    // 데이터 검증
    const schema = Joi.object().keys({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const result = Joi.validate(ctx.request.body, schema);

    if (result.error) {
        ctx.status = 400; // Bad Request
        return;
    }

    const { email, password } = ctx.request.body;

    // 이메일로 계정 찾기
    const account = await Accounts.findByEmail(email);

    if (!account || !account.validatePassword(password)) {
        // 유저가 존재하지 않거나 || 비밀번호가 일치하지 않으면
        ctx.status = 403; // Forbidden
        return;
    }

    // 토큰 생성
    const token = await account.generateToken();

    // 토큰을 쿠키에 저장
    setTokenToCookie(ctx, token);

    // 프로필 정보로 응답
    ctx.body = account.profile;
};

// 이메일 / 아이디 존재유무 확인
exports.exists = async (ctx) => {
    const { key, value } = ctx.params;

    // key 에 따라 findByEmail 혹은 findByUsername 을 실행합니다.
    const account = await (key === 'email' ? Accounts.findByEmail(value) : Accounts.findByUsername(value));

    ctx.body = {
        exists: account !== null
    };
};

// 로그아웃
exports.logout = (ctx) => {
    // 토큰에 null값 저장
    setTokenToCookie(ctx, null);

    ctx.status = 200;
};

// 현재 로그인된 유저의 정보를 알려줌, user: { _id, profile }
exports.check = (ctx) => {
    const { user } = ctx.request;

    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    ctx.body = user.profile;
};

// 이메일 인증
exports.emailVerify = async (ctx) => {
    // 데이터 검증
    const schema = Joi.object().keys({
        email: Joi.string().email().required(),
        key: Joi.string().hex().required()
    });

    const result = Joi.validate(ctx.request.body, schema);

    if (result.error) {
        ctx.status = 400; // Bad Request
        return;
    }

    const { email, key } = ctx.request.body;

    // 이메일로 유저 인스턴스를 찾음
    const account = await Accounts.findByEmail(email);

    // key 일치여부 확인
    if (account.email.key_for_verify != key) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 일치하면 profile.verified 를 true 로 업데이트
    await account.update({ 'profile.verified': true });

    // 업데이트된 document 가져옴
    const updatedAccount = await Accounts.findByEmail(email);

    // 바뀐 profile의 토큰을 다시 생성
    const token = await updatedAccount.generateToken();

    // 토큰을 쿠키에 저장
    setTokenToCookie(ctx, token);

    ctx.status = 200;
}

// 인증 메일 전송
exports.emaliSend = async (ctx) => {
    // 토큰 정보 확인
    const { user } = ctx.request;

    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저 조회
    const account = await Accounts.findByUsername(user.profile.username);

    // 인증 메일 전송
    await account.sendMail();

    ctx.status = 200;
}

// 페이스북 로그인 콜백
exports.fbLoginCb = (ctx) => {
    return passport.authenticate('facebook', async (err, profile, info) => {
        // 계정 조회
        let account = await Accounts.findByEmail(profile.emails[0].value);

        // 계정이 없다면
        if (!account) {
            // 계정 생성
            account = await Accounts.socialRegister(profile.emails[0].value);
        }

        // 방이 없을 시 방 생성
        if (account.room_id === undefined) {
            const room = await Rooms.createRoom(account._id);

            // 계정의 room_id 필드 업데이트
            await account.update({ 'room_id': room._id });
        }

        // 토큰 생성
        const token = await account.generateToken();

        // 토큰을 쿠키에 저장
        setTokenToCookie(ctx, token);

        // 페이지 리다이렉트
        ctx.redirect(process.env.CLIENT_HOST + '/auth/social');
    })(ctx);
}

// 구글 로그인 콜백
exports.ggLoginCb = (ctx) => {
    return passport.authenticate('google', async (err, profile, info) => {
        // 계정 조회
        let account = await Accounts.findByEmail(profile.emails[0].value);

        // 계정이 없다면
        if (!account) {
            // 계정 생성
            account = await Accounts.socialRegister(profile.emails[0].value);
        }

        // 방이 없을 시 방 생성
        if (account.room_id === undefined) {
            const room = await Rooms.createRoom(account._id);

            // 계정의 room_id 필드 업데이트
            await account.update({ 'room_id': room._id });
        }

        // 토큰 생성
        const token = await account.generateToken();

        // 토큰을 쿠키에 저장
        setTokenToCookie(ctx, token);

        // 페이지 리다이렉트
        ctx.redirect(process.env.CLIENT_HOST + '/auth/social');
    })(ctx);
}
