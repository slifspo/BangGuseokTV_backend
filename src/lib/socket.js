const Rooms = require('models/room');
const Accounts = require('models/account');
const { playState, startPlayerlist } = require('lib/playerlist');

// 추가,삭제가 잦으므로 Map 사용
const loginUsername = new Map(); // key: username, value: socket.id
const loginSocketId = new Map(); // key: socket.id, value: username

module.exports.loginUsername = loginUsername;
module.exports.loginSocketId = loginSocketId;
module.exports.init = (io) => {
    // 소켓 이벤트 정의
    io.on('connection', (socket) => {
        //console.log('클라이언트가 연결됨: ' + socket.id);

        // 초기화
        socket.on('init', (data) => {
            //console.log('init: ' + socket.id);

            const { username } = data;

            // 유저정보 업데이트
            loginUsername.set(username, socket.id);
            loginSocketId.set(socket.id, username);

            // 개인메세지를 위한 방
            socket.join(socket.id);
        })

        // 방 참가
        socket.on('joinRoom', (data) => {
            //console.log('joinRoom: ' + socket.id);

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
            //console.log('leaveRoom: ' + socket.id);

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
    })

    // 소켓 연결해제
    io.on('disconnect', async (ctx, data) => {
        //console.log('클라이언트 연결해제: ' + ctx.socket.id);

        const disconnUsername = loginSocketId[ctx.socket.id];

        // 로그인하지 않은 유저라면 여기서 멈춤
        if (disconnUsername === undefined) return;

        // 연결해제한 유저의 친구목록 불러옴
        let account = null;
        try {
            account = await Accounts.findOne({'profile.username': disconnUsername}).populate('friendlist', 'profile');
        } catch (e) {
            console.log(e);
            return;
        }

        // 친구목록 추출
        const friendlist = account.friendlist.map(user => (
            user.profile.username
        ));

        // 친구목록의 유저들에게 메세지 보내기
        friendlist.forEach(username => {
            const friendSocketId = loginUsername.get(username);
            io.to(friendSocketId).emit('userDisconnected', disconnUsername);
        });

        // 유저이름 브로드캐스트
        //io.broadcast('userDisconnected', loginUsername[ctx.socket.id]);

        // 유저 제거
        loginUsername.delete(disconnUsername);
        loginSocketId.delete(ctx.socket.id);

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