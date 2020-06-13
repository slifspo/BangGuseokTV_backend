const Rooms = require('models/room');
const Accounts = require('models/account');

let playState = {}; // [isPlaying, timerObject, username, videoId, videoDuration]

// convert ISO 8601 duration (second)
const convertTime = (youtube_time) => {
    array = youtube_time.match(/(\d+)(?=[MHS])/ig) || [];
    return parseInt(array[0]) * 60 + parseInt(array[1]);
}

// 타이머 객체의 남은 시간 반환
const getTimeLeft = timeout => {
    const timeleft = Math.ceil((timeout._idleStart + timeout._idleTimeout) / 1000 - process.uptime());
    //console.log(timeleft);
    return timeleft;
}

const startPlayerlist = async (ctx, hostname, room_id) => {
    const { io } = ctx;
    // playState 상태 시작으로 변경
    playState[hostname][0] = true;

    // playerlist 의 first player 찾기
    let room = null;
    try {
        room = await Rooms.findOne({
            '_id': room_id,
        });
    } catch (e) {
        console.log(e);
        return;
    }
    const firstPlayer = room.playerlist[0];

    // playerlist 에 아무도 없을 때
    if (firstPlayer === undefined) {
        //console.log(hostname + ' 방의 playerlist 멈춤');
        // playerlist 정지
        playState[hostname] = [false, null, '', '', null];

        // 클라이언트 playState 초기화
        io.to(hostname).emit('sendPlayState', {
            username: '',
            videoId: '',
            videoDuration: null
        });
        return;
    }

    // 재생중인 username 저장
    playState[hostname][2] = firstPlayer.username;

    // firstPlayer를 배열에서 pop
    try {
        await Rooms.updateOne(
            {
                '_id': room_id,
            },
            {
                '$pop': { playerlist: -1 }
            }
        );
    } catch (e) {
        console.log(e);
        return;
    }

    // firstPlayer 에 해당하는 유저의 firstVideo 찾기
    let account = null;
    try {
        account = await Accounts.findOne({
            'profile.username': firstPlayer.username,
        });
    } catch (e) {
        console.log(e);
    }
    const selectedPlaylist = account.selectedPlaylist;
    const firstVideo = account.playlists[selectedPlaylist].videos[0];

    let videoDuration = null; // 비디오 재생시간
    // firstPlayer의 firstVideo가 있으면
    if (firstVideo !== undefined) {
        //console.log(firstPlayer.username + ' 의 playlist \'' + account.playlists[selectedPlaylist].name + '\' 의 ' + firstVideo.videoTitle + ' 이 재생중');

        // 재생중인 videoId 저장
        playState[hostname][3] = firstVideo.videoId;

        // YouTube Data API 로 video duration 얻기
        const optionParams = { // 검색 파라미터
            id: firstVideo.videoId,
            part: "contentDetails",
            key: process.env.GOOGLE_API_KEY
        };
        let url = "https://www.googleapis.com/youtube/v3/videos?"; // URL 생성
        for (let option in optionParams) {
            url += option + "=" + optionParams[option] + "&";
        }
        url = url.substr(0, url.length - 1); //url의마지막에 붙어있는 & 정리

        // http 요청
        let res = null;
        try {
            res = await ctx.get(url);
        } catch (e) {
            ctx.throw(500, e);
        }

        // 유튜브 video 의 재생시간 변환
        videoDuration = convertTime(res.items[0].contentDetails.duration);

        // firstVideo를 배열에서 pop
        try {
            await Accounts.updateOne(
                {
                    'profile.username': firstPlayer.username,
                },
                {
                    '$pop': { ['playlists.' + selectedPlaylist + '.videos']: -1 }
                }
            );
        } catch (e) {
            console.log(e);
            return;
        }

        // firstVideo를 배열 마지막에 add
        try {
            await Accounts.updateOne(
                {
                    'profile.username': firstPlayer.username,
                },
                {
                    '$push': {
                        ['playlists.' + selectedPlaylist + '.videos']: firstVideo
                    }
                }
            )
        } catch (e) {
            console.log(e);
            return;
        }

        // firstPlayer를 배열 마지막에 add
        try {
            await Rooms.updateOne(
                {
                    '_id': room_id,
                },
                {
                    '$addToSet': {
                        'playerlist': {
                            'username': firstPlayer.username,
                            'socketId': firstPlayer.socketId
                        }
                    }
                }
            )
        } catch (e) {
            console.log(e);
            return;
        }

        // playState를 emit
        io.to(hostname).emit('sendPlayState', {
            username: firstPlayer.username,
            videoId: firstVideo.videoId,
            videoDuration: videoDuration
        });
    } else {
        console.log(firstPlayer.username + ' 의 ' + account.playlists[selectedPlaylist].name + ' 에 동영상이 없음')
        // io.emit 으로 대기열에서 나가졌다고 알리기
    }

    videoDuration = (videoDuration === null) ? 2 : videoDuration; // 비디오 재생시간
    playState[hostname][4] = videoDuration
    const timerObj = setTimeout(startPlayerlist, videoDuration * 1000, ctx, hostname, room_id); // 재귀타이머 설정
    playState[hostname][1] = timerObj; // 타이머 객체 저장
};
module.exports = {
    playState, getTimeLeft, startPlayerlist
}