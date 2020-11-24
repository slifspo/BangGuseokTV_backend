const Rooms = require('models/room');
const Accounts = require('models/account');
const { startPlayerlist, getOrDefaultPlayInfo, deletePlayinfo, getPlayInfo, getTimeLeft } = require('lib/playerlist');

// 로그인한 유저의 소켓id
const loginUsername = new Map(); // key: username, value: socket.id
// 소켓id의 유저이름
const loginSocketId = new Map(); // key: socket.id, value: username
// 유저가 어떤 hostname의 대기열에 참가했는지 저장
const joinedPlayerlist = new Map(); // key: username, value: hostname

// 친구목록에 있는 유저에게 connected/disconnected 알리기
const userConnected = async (connUsername, io, isConnected) => {
    // 연결해제한 유저의 친구목록 불러옴
    const account = await Accounts.findOne({ 'profile.username': connUsername }).populate('friendlist', 'profile');

    // 친구목록 추출
    const friendlist = account.friendlist.map(user => user.profile.username);

    // 로그인한 친구목록의 유저들에게 메세지 보내기
    friendlist.forEach(username => {
        if (loginUsername.has(username)) {
            const friendSocketId = loginUsername.get(username);
            io.to(friendSocketId).emit('friendConnected', { connUsername, isConnected });
        }
    });
}

// 유저를 대기열에서 제거
const removeUserFromPlayerlist = (io, username) => {
    // 유저가 대기열에 참가한 방의 hostname
    const hostname = joinedPlayerlist.get(username);

    // 유저가 대기열에 참가했다면
    if (hostname !== undefined) {
        const playInfo = getPlayInfo(hostname);

        // 대기열에서 유저 제거
        const pos = playInfo.queue.indexOf(username);
        playInfo.queue.splice(pos, 1);

        // 대기열이 비었다면
        if (playInfo.queue.length === 0) {
            // 타이머 해제
            clearTimeout(playInfo.timerObj);

            // playInfo 삭제
            deletePlayinfo(hostname);

            // 방에 있는 유저들의 playInfo 초기화
            io.to(hostname).emit('sendPlayInfo', {
                sort: 'info',
                username: '',
                videoId: '',
                videoDuration: null,
            });
        } else { // 대기열에 유저가 남아있으면
            // 접속종료한 유저 === 재생중이던 유저일 경우
            if (playInfo.username === username) {
                // 대기열 다시 시작
                clearTimeout(playInfo.timerObj);
                startPlayerlist(io, hostname);
            }
        }
    }

    // 유저 제거
    joinedPlayerlist.delete(username);
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

        // 친구관련 통신시 Receiver에게 Sender의 profile 정보를 보냄
        socket.on('sendProfile', async (data) => {
            // username: Sender, friendname: Receiver
            const { username, friendname, sort } = data;

            // 온라인일때
            if (loginUsername.has(friendname)) {
                const friendSocketId = loginUsername.get(friendname);

                // Sender의 account 불러옴
                const account = await Accounts.findOne({ 'profile.username': username });

                // Receiver에게 Sender의 profile 정보 emit
                if (sort === 'friendRequest') {
                    // 친구요청
                    io.to(friendSocketId).emit('receiveFriendRequest', account.profile);
                } else if (sort === 'friendAccept') {
                    // 친구요청 수락
                    io.to(friendSocketId).emit('receiveFriendAccept', {
                        ...account.profile,
                        isOnline: loginUsername.has(username) // 온라인여부
                    });
                } else if (sort === 'friendReject') {
                    // 친구요청 거절
                    io.to(friendSocketId).emit('receiveFriendReject', account.profile);
                } else if (sort === 'friendDelete') {
                    // 친구삭제
                    io.to(friendSocketId).emit('receiveFriendDelete', account.profile);
                }
            }
        })

        // 유저가 대기열에 참가했을때
        socket.on('joinPlayerlist', async (data) => {
            const { username, hostname } = data;

            // joinedPlayerlist 에 추가
            joinedPlayerlist.set(username, hostname);

            // playerlist 에 유저 추가
            const playInfo = getOrDefaultPlayInfo(hostname);
            playInfo.queue.push(username);

            // 대기열이 돌아가고 있지 않았다면
            if (playInfo.timerObj === null) {
                // 대기열 시작
                startPlayerlist(io, hostname);
            }
        })

        // 유저가 대기열을 나갔을때
        socket.on('leavePlayerlist', async (data) => {
            const { username } = data;

            removeUserFromPlayerlist(io, username);
        })

        // 유저가 playInfo 요청할때
        socket.on('reqPlayInfo', async (data) => {
            const { sort, username, hostname } = data;

            // playInfo 가져옴
            const playInfo = getPlayInfo(hostname);

            // user 의 socket id 가져옴
            const userSocketId = loginUsername.get(username);

            // playInfo 가 있다면
            if (playInfo !== undefined) {
                // info 요청시
                if (sort === 'info') {
                    // 해당 유저에게 playInfo 보냄
                    io.to(userSocketId).emit('sendPlayInfo', {
                        sort: sort,
                        username: playInfo.username,
                        videoId: playInfo.videoId,
                        videoDuration: playInfo.videoDuration,
                    });
                } else if (sort === 'timeleft') { // timeleft 요청시
                    // timeleft 구함
                    const timeleft = getTimeLeft(playInfo.timerObj);

                    // 해당 유저에게 timeleft 보냄
                    io.to(userSocketId).emit('sendPlayInfo', {
                        sort: sort,
                        videoTimeLeft: timeleft,
                    });
                }
            }
        })
    })

    // 소켓 연결해제
    io.on('disconnect', async (ctx, data) => {

        // 로그인하지 않은 유저라면 여기서 멈춤
        if (!loginSocketId.has(ctx.socket.id)) return;

        // 접속종료한 유저이름 얻기
        const disconnUsername = loginSocketId.get(ctx.socket.id);

        // 친구목록에 있는 유저에게 disconnected 알리기
        userConnected(disconnUsername, io, false);

        // 접속종료한 유저 대기열에서 제거
        removeUserFromPlayerlist(io, disconnUsername);

        // 유저 제거
        loginUsername.delete(disconnUsername);
        loginSocketId.delete(ctx.socket.id);
    })
}