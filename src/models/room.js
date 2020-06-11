const mongoose = require('mongoose');
const { Schema } = mongoose;

const Room = new Schema({
    profile: {
        title: { type: String, default: 'Untitled' },
        description: { type: String, default: 'no content' },
        thumbnail: { // 프로필이미지
            data: Buffer,
            contentType: String,
        }
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
    favoriteCount: { type: Number, default: 0 }, // 즐겨찾기 한 수
    playerlist: [
        Schema({
            username: String,
            socketId: String
        },
        {
            _id: false
        })
    ],
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true } // 호스트 유저의 ObjectId
});

/* ************* */
/* static 메소드 */
/* ************* */

// user_id 로 방 검색
Room.statics.findByUserId = function (user_id) {
    return this.findOne({ 'user_id': user_id }).exec();
}

// 방 생성
Room.statics.createRoom = function (user_id) {
    const room = new this({
        user_id: user_id
    });

    return room.save();
};

// 즐겨찾기수 기준 오름차순, 12개
Room.statics.getRooms = function () {
    return this.find()
        .populate('user_id')
        .sort('-favoriteCount')
        .limit(12)
        .select('profile favoriteCount user_id');
};

/* ************** */
/* 인스턴스 메소드 */
/* ************** */

module.exports = mongoose.model('Room', Room);