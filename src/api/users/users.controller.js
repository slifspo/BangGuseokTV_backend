const Joi = require('joi');
const Accounts = require('models/account');
const Rooms = require('models/room');

// 로컬 회원가입
exports.localRegister = async (ctx) => {
    // 데이터 검증
    const schema = Joi.object().keys({
        username: Joi.string().regex(/^[a-z|A-Z|0-9]+$/).min(3).max(20).required(), // 영어숫자 3~20자
        email: Joi.string().email().required(),
        password: Joi.string().required().min(6)
    });

    const result = Joi.validate(ctx.request.body, schema);

    if (result.error) {
        ctx.status = 400; // Bad request
        return;
    }

    // 아이디 / 이메일 중복 체크
    let existing = null;
    try {
        existing = await Accounts.findByEmailOrUsername(ctx.request.body);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    if (existing) {
        // 중복되는 아이디/이메일이 있을 경우
        ctx.status = 409; // Conflict
        // 어떤 값이 중복되었는지 알려줍니다
        ctx.body = {
            key: existing.email.address === ctx.request.body.email ? 'email' : 'username'
        };
        return;
    }

    // 계정 생성
    let account = null;
    try {
        account = await Accounts.localRegister(ctx.request.body);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 방 생성
    let room = null;
    try {
        room = await Rooms.createRoom(account._id);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 방의 hostname 변경
    try { // 일치하면 profile.verified 를 true 로 업데이트
        await Rooms.updateOne(
            {
                'host_id': account._id
            },
            {
                '$set': {
                    'hostname': ctx.request.body.username
                }
            }
        );
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 계정의 room_id 필드 업데이트
    try {
        await account.update({ 'room_id': room._id });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 인증 메일 전송
    let mail = null;
    try {
        mail = await account.sendMail();
    } catch (e) {
        ctx.throw(500, e);
    }

    // 토큰 생성
    let token = null;
    try {
        token = await account.generateToken();
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
    ctx.body = account.profile; // 프로필 정보로 응답합니다.
};

// 유저이름 설정
exports.updateUsername = async (ctx) => {
    const { user } = ctx.request;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저이름이 null일때만 허용
    let account = null;
    try {
        account = await Accounts.findById(user._id);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }
    if (account.profile.username !== null) {
        ctx.status = 406; // Not allowed
        return;
    }

    // 데이터 검증
    const schema = Joi.object().keys({
        username: Joi.string().regex(/^[a-z|A-Z|0-9]+$/).min(3).max(20).required(), // 영어숫자 3~20자
    });

    const result = Joi.validate(ctx.request.body, schema);

    if (result.error) {
        ctx.status = 400; // Bad request
        return;
    }

    const { username } = ctx.request.body;

    // 중복 체크
    let existing = null;
    try {
        existing = await Accounts.findByUsername(username);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    if (existing) {
        // 중복되는 유저이름이 있을 경우
        ctx.status = 409; // Conflict
        // 어떤 값이 중복되었는지 알려줍니다
        ctx.body = {
            key: 'username'
        };
        return;
    }

    // 유저이름 변경
    try { // 일치하면 profile.verified 를 true 로 업데이트
        await account.update({ 'profile.username': username });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 업데이트된 account 가져옴
    try {
        account = await Accounts.findById(user._id);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 방의 hostname 변경
    try { // 일치하면 profile.verified 를 true 로 업데이트
        await Rooms.updateOne(
            {
                '_id': account.room_id
            },
            {
                '$set': {
                    'hostname': username
                }
            }
        );
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 바뀐 profile의 토큰을 다시 생성
    let token = null;
    try {
        token = await account.generateToken();
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
    ctx.body = account.profile.username; // 유저이름으로 응답.
}

// 아바타 업데이트
exports.updateAvatar = async (ctx) => {
    const { user } = ctx.request;
    const { avatar } = ctx.request.body;
    const { username } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저 account 찾기
    let account = null;
    try {
        account = await Accounts.findByUsername(username);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 아바타 변경
    try {
        await account.update({ 'profile.avatar': avatar });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 바뀐 profile의 토큰을 다시 생성
    let token = null;
    try {
        account = await Accounts.findById(user._id);; // 업데이트된 document 가져옴
        token = await account.generateToken();
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.cookies.set('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
    ctx.body = account.profile.avatar;
}

// 재생목록에 항목 추가
exports.addToPlaylist = async (ctx) => {
    const { user } = ctx.request;
    const { videoInfo } = ctx.request.body;
    const { username, playlistIndex } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 항목 추가
    try {
        await Accounts.updateOne(
            {
                'profile.username': username,
            },
            {
                '$push': {
                    ['playlists.' + playlistIndex + '.videos']: videoInfo
                }
            });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No Content
}

// 재생목록에 항목 제거
exports.removeFromPlaylist = async (ctx) => {
    const { user } = ctx.request;
    const { username, playlistIndex, videoIndex } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 항목 제거
    try {
        await Accounts.updateOne(
            {
                'profile.username': username,
            },
            {
                '$unset': { ['playlists.' + playlistIndex + '.videos.' + videoIndex]: 1 } // 배열의 element 를 null 로 만듬
            });
        await Accounts.updateOne(
            {
                'profile.username': username,
            },
            {
                '$pull': { ['playlists.' + playlistIndex + '.videos']: null } // null 인 element 를 없앰
            });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No Content
}

// 재생목록 가져오기
exports.getPlaylists = async (ctx) => {
    const { user } = ctx.request;
    const { username } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저 account 찾기
    let account = null;
    try {
        account = await Accounts.findById(user._id);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.body = account.playlists;
}

// 재생목록의 동영상 가져오기
exports.getPlaylistVideos = async (ctx) => {
    const { user } = ctx.request;
    const { username, playlistIndex } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    if(playlistIndex == -1) {
        ctx.body = {
            name: '선택한 재생목록이 없음',
            videos: []
        }
        return;
    }

    // 유저 playlist 찾기
    let result = null;
    try {
        result = await Accounts.aggregate([
            {
                '$match': {
                    'profile.username': username,
                }
            },
            {
                '$project': {
                    'playlist': { '$arrayElemAt': ['$playlists', parseInt(playlistIndex)] }
                }
            }
        ])
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.body = result[0].playlist;
}

// 새로운 재생목록 추가
exports.addPlaylist = async (ctx) => {
    const { user } = ctx.request;
    const { username } = ctx.params;
    const { playlistName } = ctx.request.body;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 항목 추가
    try {
        await Accounts.updateOne(
            {
                'profile.username': username,
            },
            {
                '$push': {
                    'playlists': {
                        'name': playlistName,
                        'videos': []
                    }
                }
            });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No Content
}

// 재생목록에 항목 제거
exports.removePlaylist = async (ctx) => {
    const { user } = ctx.request;
    const { username, playlistIndex } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 항목 제거
    try {
        await Accounts.updateOne(
            {
                'profile.username': username,
            },
            {
                '$unset': { ['playlists.' + playlistIndex]: 1 } // 배열의 element 를 null 로 만듬
            });
        await Accounts.updateOne(
            {
                'profile.username': username,
            },
            {
                '$pull': { 'playlists': null } // null 인 element 를 없앰
            });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.status = 204; // No Content
}

// 선택된 재생목록 설정
exports.updateSelectedPlaylist = async (ctx) => {
    const { user } = ctx.request;
    const { username } = ctx.params;
    const { selectedPlaylist } = ctx.request.body;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // selectedPlaylist 변경
    try {
        await Accounts.updateOne(
            {
                'profile.username': username
            },
            {
                '$set': {
                    'selectedPlaylist': selectedPlaylist
                }
            }
        );
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.body = { selectedPlaylist: selectedPlaylist }
}

// 유저이름 검색
exports.searchUsername = async (ctx) => {
    const { user } = ctx.request;
    const { keyword } = ctx.params;

    // 권한 검증
    if (!user) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저의 account 얻기, populate
    let populatedAccount = null;
    try {
        populatedAccount = await Accounts.findOne({ '_id': user._id }).populate('friendlist', 'profile');
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 키워드에 해당하는 유저이름 모두 검색
    let detectedUsers = null;
    try {
        // like keyword 이고 대소문자 구분없이 이름검색 
        detectedUsers = await Accounts.find({ 'profile.username': { $regex: '.*' + keyword + '.*', $options: 'i' }});
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 유저의 친구목록과 검색한 유저목록을 비교해서 친구추가가 되어있는지 여부 추가
    const friendlist = populatedAccount.friendlist.map(data => data.profile.username);
    const result = detectedUsers.map(user => (
        {...user.profile, isFriend: friendlist.includes(user.profile.username)}
    ));

    ctx.body = result;
}

// 친구추가
exports.addFriend = async (ctx) => {
    const { user } = ctx.request;
    const { username } = ctx.params;
    const { friendname } = ctx.request.body;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저의 account 얻기, populate
    let populatedAccount = null;
    try {
        populatedAccount = await Accounts.findOne({ '_id': user._id }).populate('friendlist', 'profile');
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 친구추가할 유저의 account 얻기
    let friendAccount = null;
    try {
        friendAccount = await Accounts.findByUsername(friendname);
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 이미 친구추가가 되어있는지 체크
    const friendlist = populatedAccount.friendlist.map(data => data.profile.username);
    if (friendlist.includes(friendAccount.profile.username)) {
        ctx.status = 406; // Not allowed
        return;
    }

    // 친구 추가(oid)
    try {
        await Accounts.updateOne(
            {
                'profile.username': username,
            },
            {
                '$push': {
                    'friendlist': friendAccount._id
                }
            });
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    ctx.body = 204; // No Content
}

// 친구목록 조회
exports.getFriendlist = async (ctx) => {
    const { user } = ctx.request;
    const { username } = ctx.params;

    // 권한 검증
    if (!user || user.profile.username != username) {
        ctx.status = 403; // Forbidden
        return;
    }

    // 유저의 account 얻기, populate
    let populatedAccount = null;
    try {
        populatedAccount = await Accounts.findOne({ 'profile.username': username }).populate('friendlist', 'profile');
    } catch (e) {
        ctx.throw(500, e);
        return;
    }

    // 친구목록에 온라인/오프라인 여부 표시
    const { loginUser } = require('lib/socket');
    const loginUserlist = Object.values(loginUser);
    const result = populatedAccount.friendlist.map(user => (
        {...user.profile, isOnline: loginUserlist.includes(user.profile.username)}
    ));

    ctx.body = result; // No Content
}