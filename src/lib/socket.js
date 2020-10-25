const Rooms = require('models/room');
const Accounts = require('models/account');
const { playState, startPlayerlist } = require('lib/playerlist');

// 추가,삭제가 잦으므로 Map 사용
const loginUsername = new Map(); // key: username, value: socket.id
const loginSocketId = new Map(); // key: socket.id, value: username

// 친구목록에 있는 유저에게 connected/disconnected 알리기
const userConnected = async (connUsername, io, isConnected) => {
    // 연결해제한 유저의 친구목록 불러옴
    let account = null;
    try {
        account = await Accounts.findOne({ 'profile.username': connUsername }).populate('friendlist', 'profile');
    } catch (e) {
        console.log(e);
        return;
    }

    // 친구목록 추출
    const friendlist = account.friendlist.map(user => (
        user.profile.username
    ));

    // 로그인한 친구목록의 유저들에게 메세지 보내기
    friendlist.forEach(username => {
        if (loginUsername.has(username)) {
            const friendSocketId = loginUsername.get(username);
            io.to(friendSocketId).emit('friendConnected', { connUsername, isConnected });
        }
    });

    return;
}

// Exports
module.exports.loginUsername = loginUsername;
module.exports.loginSocketId = loginSocketId;

// 소켓 이벤트 선언
module.exports.init = (io) => {
    // 소켓 연결
    io.on('connection', (socket) => {

        // 초기화
        socket.on('init', (data) => {
            const { username } = data;

            // 유저정보 업데이트
            loginUsername.set(username, socket.id);
            loginSocketId.set(socket.id, username);

            // 친구목록에 있는 유저에게 connected 알리기
            userConnected(username, io, true);
        })

        // 방 참가
        socket.on('joinRoom', (data) => {
            const { hostname, username } = data;

            socket.join(hostname);
            io.to(hostname).emit('receiveChat', {
                type: 'alert',
                info: {
                    message: username + " 님이 입장하셨습니다."
                }
            })
        });

        // 방 나가기
        socket.on('leaveRoom', (data) => {
            const { hostname, username } = data;

            socket.leave(hostname);
            io.to(hostname).emit('receiveChat', {
                type: 'alert',
                info: {
                    message: username + " 님이 퇴장하셨습니다."
                }
            })
        });

        // 메세지 전송
        socket.on('sendChat', (data) => {
            const { hostname, username, avatar, message } = data;

            io.to(hostname).emit('receiveChat', {
                type: 'chat',
                info: {
                    username,
                    avatar,
                    message
                }
            })
        })

        // 친구관련 요청시 요청받은유저에게 요청한유저의 profile 정보를 보냄
        socket.on('sendFriendRequest', async (data) => {
            // username: 요청한유저, friendname: 요청받은유저
            const { username, friendname, sort } = data;

            // 온라인일때
            if (loginUsername.has(friendname)) {
                const friendSocketId = loginUsername.get(friendname);

                // 요청한유저의 account 불러옴
                let account = null;
                try {
                    account = await Accounts.findOne({ 'profile.username': username });
                } catch (e) {
                    console.log(e);
                    return;
                }

                // 요청받은유저에게 요청한유저의 profile 정보 emit
                if (sort === 'friendRequest') {
                    io.to(friendSocketId).emit('receiveFriendRequest', account.profile);
                } else if (sort === 'friendAccept') {
                    io.to(friendSocketId).emit('receiveFriendAccept', account.profile);
                }
            }
        })
    })

    // 소켓 연결해제
    io.on('disconnect', async (ctx, data) => {

        // 로그인하지 않은 유저라면 여기서 멈춤
        if (!loginSocketId.has(ctx.socket.id)) return;

        const disconnUsername = loginSocketId.get(ctx.socket.id);

        // 친구목록에 있는 유저에게 disconnected 알리기
        await userConnected(disconnUsername, io, false);

        // 유저 제거
        loginUsername.delete(disconnUsername);
        loginSocketId.delete(ctx.socket.id);

        /* 
         * 유저가 playerlist에 참가한상태로 disconnect했을 경우 
         * playerlist에서 나가게하기 
         */
        // socket id 가 일치하는 room 을 검색
        let room = null;
        try {
            room = await Rooms.findOne({
                'playerlist.socketId': ctx.socket.id
            })
        } catch (e) {
            console.log(e);
            return;
        }

        if (room === null) return;
        const { hostname } = room;

        // socket id 와 일치하는 playerlist 의 username field 얻기
        let result = null;
        try {
            result = await Rooms.find(
                {
                    'hostname': hostname,
                    'playerlist': {
                        '$elemMatch': { socketId: ctx.socket.id }
                    }
                },
                {
                    'playerlist.$.username': 1
                }
            )
        } catch (e) {
            console.log(e);
            return;
        }

        //console.log(result[0]);
        const { username } = result[0].playerlist[0];

        // playerlist 에서 제거
        try {
            await Rooms.updateOne(
                {
                    'hostname': hostname
                },
                {
                    '$pull': {
                        'playerlist': {
                            'socketId': ctx.socket.id
                        }
                    }
                }
            );
        } catch (e) {
            console.log(e);
            return;
        }

        // playerlist 에 한명이라도 있는지 확인
        try {
            room = await Rooms.findOne({
                'hostname': hostname,
            })
        } catch (e) {
            console.log(e);
            return;
        }
        if (room.playerlist[0] === undefined) { // playerlist 가 비어있으면
            if (playState[hostname] !== undefined) {
                clearTimeout(playState[hostname][1]); // 타이머 해제
                playState[hostname] = [false, null, '', '', null]; // 초기화
                io.to(hostname).emit('sendPlayState', { // 클라이언트 playState 초기화
                    username: '',
                    videoId: '',
                    videoDuration: null
                });
            }
        } else { // playerlist 에 유저가 있으면
            if (playState[hostname][2] === username) { // play 중인 유저가 나갔을 시
                clearTimeout(playState[hostname][1]); // 현재 타이머 해제
                playState[hostname] = [false, null, '', '', null]; // 초기화
                startPlayerlist(io, hostname); // playerlist 재시작
            }
        }
    })
}