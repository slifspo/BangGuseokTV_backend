const jwtSecret = process.env.JWT_SECRET;
const jwt = require('jsonwebtoken');
const jwtPeriod = 1000 * 60 * 60 * 1; // 1hour

// JWT 토큰 생성
const generateToken = function (payload) {
    return new Promise(
        (resolve, reject) => {
            jwt.sign(
                payload,
                jwtSecret,
                {
                    expiresIn: '7d'
                }, (error, token) => {
                    if (error) reject(error);
                    resolve(token);
                }
            );
        }
    );
};

// JWT 디코딩
const decodeToken = function (token) {
    return new Promise(
        (resolve, reject) => {
            jwt.verify(token, jwtSecret, (error, decoded) => {
                if (error) reject(error);
                resolve(decoded);
            });
        }
    );
}

// Access Token을 쿠키에 설정
const setTokenToCookie = function (ctx, token) {
    // 쿠키 설정 옵션
    const options = {
        maxAge: jwtPeriod,
        httpOnly: true,
        sameSite: 'none',
        secure: true
    }

    // 토큰이 없을시 유효기간 0으로 설정
    if (token == null) {
        options.maxAge = 0;
    }

    // 쿠키 설정
    ctx.cookies.set('access_token', token, options);
}

// JWT 처리 미들웨어
const jwtMiddleware = async (ctx, next) => {
    const token = ctx.cookies.get('access_token'); // ctx 에서 access_token 을 읽어옵니다

    if (!token) return next(); // 토큰이 없으면 바로 다음 작업을 진행합니다.

    try {
        const decoded = await decodeToken(token); // 토큰을 디코딩 합니다

        // 토큰 만료일이 하루밖에 안남으면 토큰을 재발급합니다
        if (Date.now() / 1000 - decoded.iat > 60 * 60 * 24) {
            // 하루가 지나면 갱신해준다.
            const { _id, profile } = decoded;
            const freshToken = await generateToken({ _id, profile }, 'account');

            // 토큰을 쿠키에 저장
            setTokenToCookie(ctx, freshToken);
        }

        // ctx.request.user 에 디코딩된 값을 넣어줍니다
        ctx.request.user = decoded;
    } catch (e) {
        // token validate 실패
        ctx.request.user = null;
    }

    return next();
};

module.exports = {
    generateToken, setTokenToCookie, jwtMiddleware,
};