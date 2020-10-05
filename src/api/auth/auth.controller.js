const Joi = require('joi');
const Accounts = require('models/account');
const Rooms = require('models/room');
const passport = require('koa-passport');

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

    let account = null;
    try {
        // 이메일로 계정 찾기
        account = await Accounts.findByEmail(email);
    } catch (e) {
        ctx.throw(500, e);
    }

    if (!account || !account.validatePassword(password)) {
        // 유저가 존재하지 않거나 || 비밀번호가 일치하지 않으면
        ctx.status = 403; // Forbidden
        return;
    }

    // 토큰 생성
    let token = null;
    try {
        token = await account.generateToken();
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.cookies.set('access_token', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'none',
        secure: true
    });
    ctx.body = account.profile;
};

// 이메일 / 아이디 존재유무 확인
exports.exists = async (ctx) => {
    const { key, value } = ctx.params;
    let account = null;

    try {
        // key 에 따라 findByEmail 혹은 findByUsername 을 실행합니다.
        account = await (key === 'email' ? Accounts.findByEmail(value) : Accounts.findByUsername(value));
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.body = {
        exists: account !== null
    };
};

// 로그아웃
exports.logout = (ctx) => {
    ctx.cookies.set('access_token', null, {
        maxAge: 0,
        httpOnly: true,
        sameSite: 'none',
        secure: true
    });
    ctx.status = 204;
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

    let account = null;
    try {
        // 이메일로 유저 인스턴스를 찾음
        account = await Accounts.findByEmail(email);
    } catch (e) {
        ctx.throw(500, e);
    }

    // key 일치여부 확인
    if (account.email.key_for_verify != key) {
        ctx.status = 403; // Forbidden
        return;
    }

    try { // 일치하면 profile.verified 를 true 로 업데이트
        await account.update({ 'profile.verified': true });
    } catch (e) {
        ctx.throw(500, e);
    }

    // 바뀐 profile의 토큰을 다시 생성
    let token = null;
    try {
        account = await Accounts.findByEmail(email); // 업데이트된 document 가져옴
        token = await account.generateToken();
    } catch (e) {
        ctx.throw(500, e);
    }

    ctx.cookies.set('access_token', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'none',
        secure: true
    });
    ctx.status = 204; // No Content
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
    let account = null;
    try {
        account = await Accounts.findByUsername(user.profile.username);
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

    ctx.status = 204; // No Content
}

// 페이스북 로그인
exports.fbLogin = (ctx) => {
    passport.authenticate('facebook', { // 페이스북 로그인 진행
        authType: 'rerequest',
        scope: ['email']
    })(ctx);
}

// 페이스북 로그인 콜백
exports.fbLoginCb = (ctx) => {
    return passport.authenticate('facebook', async (err, profile, info) => {
        // 계정 조회
        let account = null;
        try {
            account = await Accounts.findByEmail(profile.emails[0].value);
        } catch (e) {
            ctx.throw(500, e);
        }

        // 계정이 없다면
        if (!account) {
            // 계정 생성
            try {
                account = await Accounts.socialRegister(profile.emails[0].value);
            } catch (e) {
                ctx.throw(500, e);
            }
        }

        // 방이 없을 시 방 생성
        if (account.room_id === undefined) {
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
        }

        // 토큰 생성
        let token = null;
        try {
            token = await account.generateToken();
        } catch (e) {
            ctx.throw(500, e);
        }

        ctx.cookies.set('access_token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            sameSite: 'none',
            secure: true
        });

        ctx.redirect('/auth/social');
    })(ctx);
}

// 구글 로그인
exports.ggLogin = (ctx) => {
    console.log("구글 로그인 진행");
    passport.authenticate('google', { // 구글 로그인 진행
        authType: 'rerequest',
        scope: ['email']
    })(ctx);
}

// 구글 로그인 콜백
exports.ggLoginCb = (ctx) => {
    return passport.authenticate('google', async (err, profile, info) => {
        // 계정 조회
        let account = null;
        try {
            account = await Accounts.findByEmail(profile.emails[0].value);
        } catch (e) {
            ctx.throw(500, e);
        }

        // 계정이 없다면
        if (!account) {
            // 계정 생성
            try {
                account = await Accounts.socialRegister(profile.emails[0].value);
            } catch (e) {
                ctx.throw(500, e);
            }
        }

        // 방이 없을 시 방 생성
        if (account.room_id === undefined) {
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
        }

        // 토큰 생성
        let token = null;
        try {
            token = await account.generateToken();
        } catch (e) {
            ctx.throw(500, e);
        }

        ctx.cookies.set('access_token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            sameSite: 'none',
            secure: true
        });

        ctx.redirect('/auth/social');
        ctx.redirect(CLIENT_HOST);
    })(ctx);
}
