const passport = require('koa-passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

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
        callbackURL: 'https://bangguseoktv.web.app/api/auth/login/facebook/callback',
        session: false, // 세션 사용안함
        profileFields: ['id', 'email', 'displayName']
    }, (accessToken, refreshToken, profile, done) => {
        // accessToken, refreshToken: 페이스북 접근 토큰
        return done(null, profile); // profile 리턴
    }));

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: 'https://bangguseoktv.web.app/api/auth/login/google/callback',
        session: false, // 세션 사용안함
        profileFields: ['id', 'email', 'displayName']
    }, (accessToken, refreshToken, profile, cb) => {
        console.log("구글strategy, profile")
        console.log(profile);
        return cb(null, profile);
    }));
}