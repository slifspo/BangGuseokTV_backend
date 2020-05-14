const Joi = require('joi');
const path = require('path');
//const moment = require('moment');
const Rooms = require('models/room');
const fs = require('fs');
//const { mkdirFile, saveFile } = require('lib/upload');

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

// 방 이미지 DB에 업로드
exports.imgUpload = async (ctx) => {
    const { user } = ctx.request;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    //const date = moment().format('YYYYMMDDHHmmss')
    const file = ctx.request.files.file;
    const ext = path.extname(file.path);
    const fileName = user.profile.username + ext; // 파일 이름
    const filePath = path.join(process.env.PUBLICPATH, 'roomImg'); // 파일 경로

    // 확장자가 없는경우 + 파일 type 검사하기도 추가하기
    if (ext === '') {
        ctx.status = 406; // Not allowed type
        return;
    }

/*    await mkdirFile(filePath); // 경로 생성
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
        return;
    }) */

    // 해당 유저의 방 찾기
    let room = null;
    try {
        room = await Rooms.findByUserId(user._id);
    } catch {
        ctx.throw(500, e);
        return;
    }

    // thumbnail 업데이트
    const imgData = fs.readFileSync(file.path);
    const contentType = file.type;
    try {
        await room.update({
            'profile.thumbnail.data': imgData,
            'profile.thumbnail.contentType': contentType
        });
    } catch (e) {
        ctx.throw(500, e);
    }

/*     // thumbnail 경로 업데이트
    try {
        await room.update({ 'profile.thumbnail': 'roomImg/' + fileName });
    } catch (e) {
        ctx.throw(500, e);
    } */

    /* const fs = require('fs');
    const img = fs.readFileSync(filePath+'\\'+fileName);
    ctx.response.set("content-type", "image/jpeg");
    ctx.body = img; */
    ctx.status = 204; // No contents
};

/* Stream을 response에 보내는 방법 */
/* const readable = require('stream').Readable
const s = new readable;

// response
app.use(ctx => {
    if (ctx.request.url === '/stream') {
        // stream data
        s.push('STREAM: Hello, World!');
        s.push(null); // indicates end of the stream
        ctx.body = s;
    } else if (ctx.request.url === '/file') {
        // stream file
        const src = fs.createReadStream('./big.file');
        ctx.response.set("content-type", "txt/html");
        ctx.body = src;
    } else {
        // normal KOA response
        ctx.body = 'BODY: Hello, World!' ;
    }
}); */
