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
    host_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }, // 호스트 유저의 ObjectId
    hostname: { type: String } // 호스트 유저의 username
});

/* ************* */
/* static 메소드 */
/* ************* */

// host_id 로 방 검색
Room.statics.findByUserId = function (host_id) {
    return this.findOne({ 'host_id': host_id }).exec();
}

// 방 생성
Room.statics.createRoom = function (host_id) {
    const room = new this({
        host_id: host_id
    });

    return room.save();
};

// 즐겨찾기수 기준 내림차순, 12개
Room.statics.getRooms = function () {
    return this.find()
        .populate('host_id')
        .sort('-favoriteCount')
        .select('profile favoriteCount host_id');
};

/* ************** */
/* 인스턴스 메소드 */
/* ************** */

module.exports = mongoose.model('Room', Room);