const passport = require('koa-passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

module.exports = () => {
    // 페이스북 전략
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_ID,
        clientSecret: process.env.FACEBOOK_SECRET,
        callbackURL: process.env.SERVER_HOST + '/api/auth/login/facebook/callback',
        profileFields: ['id', 'email', 'displayName']
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, profile); // 로그인 성공
    }));

    // 구글 전략
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: process.env.SERVER_HOST + '/api/auth/login/google/callback',
        profileFields: ['id', 'email', 'displayName']
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, profile); // 로그인 성공
    }));
};