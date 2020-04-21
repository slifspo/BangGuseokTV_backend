const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { generateToken } = require('lib/token');

// HMAC SHA256 해싱
function hash(value) {
    return crypto.createHmac('sha256', process.env.SECRET_KEY).update(value).digest('hex');
}

const Account = new Schema({
    profile: {
        username: { type: String, required: true },
        thumbnail: { type: String, default: '/static/images/default_thumbnail.png' }, // default 프로필이미지
        avatar: { type: String, default: '/static/images/default_avatar.mp4'}, // default 아바타
        verified: { type: Boolean, default: false } // 인증 여부
    },
    email: { // 로컬 계정으로 회원가입 시 이메일 인증을 해야함
         address: String, // 이메일 주소
         key_for_verify: { type: String }, // 인증 코드
    },
    social: { // 소셜 계정으로 회원가입을 할 경우에는 각 서비스에서 제공되는 accessToken 을 저장합니다
        facebookToken: String,
        googleToken: String
    },
    password: String, // 로컬계정의 경우엔 비밀번호를 해싱해서 저장합니다
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'accounts' }], // 저장된 친구의 ObjectIds
    plays: [{ // 재생목록
        id: Number,
        name: String, // 재생목록 이름 
        videos: [{
            id: Number,
            videoURL: String,
            videoTitle: String
        }]
    }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'rooms' }], // 즐겨찾기 한 방의 ObjectIds
    createdAt: { type: Date, default: Date.now } // 계정이 생성된 시각
});

/* ************* */
/* static 메소드 */
/* ************* */

// TODO:  

Account.statics.findByUsername = function(username) {
    // 객체에 내장되어있는 값을 사용 할 때는 객체명.키 이런식으로 쿼리하면 됩니다
    return this.findOne({'profile.username': username}).exec();
};

Account.statics.findByEmail = function(email) {
    return this.findOne({'email.address': email}).exec();
};

Account.statics.findByEmailOrUsername = function({username, email}) {
    return this.findOne({
        // $or 연산자를 통해 둘중에 하나를 만족하는 데이터를 찾습니다
        $or: [
            { 'profile.username': username },
            { 'email.address': email }
        ]
    }).exec();
};

Account.statics.localRegister = function({ username, email, password }) {
    // 데이터를 생성 할 때는 new this() 를 사용합니다.
    const account = new this({
        profile: {
            username: username
            // thumbnail 값을 설정하지 않으면 기본값으로 설정됩니다.
        },
        email: {
            address: email,
            key_for_verify: hash(email)
        },
        password: hash(password)       
    });

    return account.save();
};

/* ************** */
/* 인스턴스 메소드 */
/* ************** */

/*
    TODO: 친구 추가 메소드, 친구 삭제 메소드, 재생목록 추가,수정,삭제, 재생목록 동영상 추가,수정,삭제
    즐겨찾기 방 목록 조회
*/

Account.methods.validatePassword = function(password) {
    // 함수로 전달받은 password 의 해시값과, 데이터에 담겨있는 해시값과 비교를 합니다.
    const hashed = hash(password);
    return this.password === hashed;
};

Account.methods.generateToken = function() {
    // JWT 에 담을 내용
    const payload = {
        _id: this._id,
        profile: this.profile
    };

    return generateToken(payload, 'account');
};

Account.methods.sendMail = function(email) {
    const smtpTransport = nodemailer.createTransport({
        service: 'gmail', // 구글 이메일 사용
        auth: {
            user: 'hhsw1606@gmail.com',
            pass: process.env.GMAIL_PASSWORD
        }
    });

    const host = 'http://localhost:3000/' // host 이름
    
    const mailOpt = {
        from: 'hhsw1606@gmail.com',
        to: email,
        subject: '방구석TV 이메일 인증을 진행해주세요.',
        html: '<h1>이메일 인증을 위해 아래의 링크를 클릭해주세요.</h1><br>' + 
        "<a href='" + host + 'auth/emailverify?email=' + email + '&key=' + this.email.key_for_verify + "'>이메일 인증하기</a>"
    }

    return smtpTransport.sendMail(mailOpt);
}

module.exports = mongoose.model('Account', Account);