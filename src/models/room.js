const mongoose = require('mongoose');
const { Schema } = mongoose;

const Room = new Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts' }, // 호스트 유저의 ObjectId
    profile: {
        title: String,
        description: String,
        thumbnail: { type: String, default: '/static/images/default_thumbnail.png' }, // default 프로필이미지
    },
    histories: [
        { // 동영상 히스토리, 최대 30개로 제한
            username: String,
            videoURL: String,
            videoTitle: String,
            thumbsUp: Number,
            thumbsDown: Number,
            createdAt: { type: Date, default: Date.now } // 생성된 시각
        }
    ],
    favoriteCount: Number, // 즐겨찾기 한 수
});

/* ************* */
/* static 메소드 */
/* ************* */

// TODO: 방 검색, 계정생성 시 방 생성


/* 예시
    Room.statics.findByTitle = function(title) {
    // 객체에 내장되어있는 값을 사용 할 때는 객체명.키 이런식으로 쿼리하면 됩니다
    return this.findOne({'profile.title': title}).exec();
}; */

/* ************** */
/* 인스턴스 메소드 */
/* ************** */

/*
    TODO: title 수정, description 수정, thumbnail 수정, favoriteCount 증가감
    동영상재생완료시history 추가
*/

/* 예시
    Room.methods.validatePassword = function(password) {
    // 함수로 전달받은 password 의 해시값과, 데이터에 담겨있는 해시값과 비교를 합니다.
    return this.password;
}; */

module.exports = mongoose.model('Room', Room);