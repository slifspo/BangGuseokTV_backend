const Rooms = require('models/room');

module.exports = (io) => {
    // 소켓 이벤트 정의
    io.on('connection', (socket) => {
        console.log('클라이언트가 연결됨: ' + socket.id);

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
        console.log('클라이언트 연결해제: ' + ctx.socket.id);

        // playerlist 에서 제거
        try {
            await Rooms.update(
                {

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
    })
}
