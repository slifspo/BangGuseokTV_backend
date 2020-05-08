const Joi = require('joi');
const path = require('path');
const moment = require('moment');
const Rooms = require('models/room');
const { mkdirFile, saveFile } = require('lib/upload');

// 방 목록 조회, 한번에 최대 12개씩
exports.getRooms = async (ctx) => {
    const { user } = ctx.request;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 방 조회
    let rooms = null;
    try {
        rooms = await Rooms.getRooms();
    } catch (e) {
        ctx.throw(500, e);
    }

    if (rooms === null) {
        ctx.status = 204 // No contents
        return;
    }

    ctx.body = rooms;
};

// 방 이미지 업로드
exports.imgUpload = async (ctx) => {
    let date = moment().format('YYYYMMDDHHmmss')
    let file = ctx.request.files.file;
    let fileName = date + "_" + file.name // 파일 이름
    let filePath = path.join(__dirname, '../../../public/uploads'); // 파일 경로

    await mkdirFile(filePath); // 경로 생성
    await saveFile(file.path, filePath + '\\' + fileName).then(path => {
        //console.log(path);
        ctx.body = {
            error_code: 10000,
            error_message: 'Successful upload of files',
        }
    }).catch(err => {
        console.log(err);
        ctx.body = {
            error_code: 20008,
            error_message: 'Failed to upload file!'
        }
    })
};