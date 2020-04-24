const passport = require('koa-passport');
const FacebookStrategy = require('passport-facebook').Strategy;

module.exports = () => {
    passport.serializeUser((user, done) => {
        console.log('debug: serializeUser');
        done(null, user);
    });
    passport.deserializeUser((obj, done) => {
        console.log('debug: deserializeUser');
        done(null, obj);
    });

    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_ID,
        clientSecret: process.env.FACEBOOK_SECRET,
        callbackURL: 'http://localhost:' + '3000' + '/api/auth/login/facebook/callback',
        session: false, // 세션 사용안함
        profileFields: ['id', 'email', 'displayName']
    }, async (accessToken, refreshToken, profile, done) => {
        // accessToken, refreshToken: 페이스북 접근 토큰
        return done(null, profile); // profile 리턴
    }));
}