const Rooms = require('models/room');
const { playState } = require('lib/playerlist');

module.exports = (io) => {
    // 소켓 이벤트 정의
    io.on('connection', (socket) => {
        //console.log('클라이언트가 연결됨: ' + socket.id);

        // 방 참가
        socket.on('joinRoom', (hostname) => {
            socket.join(hostname);
            io.to(hostname).emit('message', {
                chat: socket.id + "님이 " + hostname + " 님의 방에 입장하셨습니다."
            })
        });
        // 방 나가기
        socket.on('leaveRoom', (hostname) => {
            socket.leave(hostname);
            io.to(hostname).emit('message', {
                chat: socket.id + "님이 퇴장하셨습니다."
            })
        });
    })

    // 소켓 연결해제
    io.on('disconnect', async (ctx, data) => {
        //console.log('클라이언트 연결해제: ' + ctx.socket.id);

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
        }
    })
}
