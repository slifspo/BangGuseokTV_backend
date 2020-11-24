const Rooms = require('models/room');
const Accounts = require('models/account');
const zenio = require('zenio');

// 추가,삭제가 잦으므로 Map 사용
const playInfoMap = new Map(); // key: hostname, value: playStateObj, 방마다 playerlist의 정보를 가지고있는 해시맵

// 비디오 재생 실패 시 delay, 초단위
const failDelay = 3;

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

// playInfoMap에서 키값에 해당하는 playInfo 반환
const getPlayInfo = (hostname) => {
    return playInfoMap.get(hostname);
}

// playInfoMap에서 키값에 해당하는 playInfo 반환, playInfo가 없으면 
const getOrDefaultPlayInfo = (hostname) => {
    let playInfo = playInfoMap.get(hostname);

    // hostname 에 playInfo 가 없다면 새로만들기
    if (playInfo === undefined) {
        playInfo = {
            queue: [], // 대기열, Array를 Queue처럼 사용
            timerObj: null, // 현재 돌아가는 타이머 객체
            username: null, // 현재 재생중인 유저
            videoId: null, // 현재 재생중인 비디오Id
            videoDuration: null, // 현재 재생중인 비디오 총 재생시간
        }
        playInfoMap.set(hostname, playInfo);
    }

    return playInfo;
}

// playInfoMap의 요소 삭제
const deletePlayinfo = (hostname) => {
    playInfoMap.delete(hostname);
}

// YouTube Data API 로 동영상 정보 요청하기
const requestYoutubeVideoInfo = async (videoId) => {
    // 검색 파라미터 설정
    const optionParams = {
        id: videoId,
        part: "contentDetails",
        key: process.env.GOOGLE_API_KEY
    };

    // URL 생성
    let url = "https://www.googleapis.com/youtube/v3/videos?";
    for (let option in optionParams) {
        url += option + "=" + optionParams[option] + "&";
    }
    url = url.substr(0, url.length - 1); //url의마지막에 붙어있는 & 정리

    // http 요청 옵션 설정
    zenio.setOptions({
        json: true, //automatically parsing of JSON response
        timeout: 3000    //3s timeout
    })

    // http 요청
    const res = await zenio.get(url);

    return res.items[0];
}

// 대기열 시작
const startPlayerlist = async (io, hostname) => {

    // hostname 의 playInfo 를 가져옴
    let playInfo = getOrDefaultPlayInfo(hostname);

    // 대기열의 맨 앞의 유저이름 dequeue
    const firstUsername = playInfo.queue.shift();

    // 대기열에 아무도 없다면
    if (firstUsername === undefined) {
        // 해당 방의 playInfo 삭제
        playInfoMap.delete(hostname);

        // 클라이언트 playState 초기화
        io.to(hostname).emit('sendPlayState', {
            username: '',
            videoId: '',
            videoDuration: null
        });

        // 함수 종료
        return;
    }

    // 맨 앞의 유저를 대기열의 맨 뒤로 보내기
    playInfo.queue.push(firstUsername);

    // 현재 재생중인 username 설정
    playInfo.username = firstUsername;

    // firstUser 의 Account 쿼리
    const firstUserAccount = await Accounts.findByUsername(firstUsername);
    // firstUser 가 선택한 재생목록 번호
    const selectedPlaylist = firstUserAccount.selectedPlaylist;

    // 선택한 재생목록이 있다면
    if (selectedPlaylist !== -1) {
        // firstUser의 선택된 playlist의 맨앞의 video 얻기
        const firstVideo = firstUserAccount.playlists[selectedPlaylist].videos[0];

        // firstVideo가 존재하면
        if (firstVideo !== undefined) {
            //console.log(firstPlayer.username + ' 의 playlist \'' + account.playlists[selectedPlaylist].name + '\' 의 ' + firstVideo.videoTitle + ' 이 재생중');

            // 재생중인 videoId 저장
            playInfo.videoId = firstVideo.videoId;

            // 유튜브에서 videoId의 동영상 정보 받아오기
            const videoInfo = await requestYoutubeVideoInfo(firstVideo.videoId);

            // 동영상 정보를 잘 받아왔다면
            if (videoInfo !== undefined) {
                // 유튜브 video 의 재생시간을 변환해서 videoDuration 설정
                playInfo.videoDuration = convertTime(videoInfo.contentDetails.duration);

                // firstVideo를 배열에서 pop
                await Accounts.updateOne(
                    {
                        'profile.username': firstUsername,
                    },
                    {
                        '$pop': { ['playlists.' + selectedPlaylist + '.videos']: -1 }
                    }
                );

                // firstVideo를 배열 마지막에 add
                await Accounts.updateOne(
                    {
                        'profile.username': firstUsername,
                    },
                    {
                        '$push': {
                            ['playlists.' + selectedPlaylist + '.videos']: firstVideo
                        }
                    }
                )

                // playInfo를 emit
                io.to(hostname).emit('sendPlayState', {
                    username: firstUsername,
                    videoId: firstVideo.videoId,
                    videoDuration: playInfo.videoDuration
                });
            } else {
                playInfo.videoDuration = failDelay;
            }
        } else {
            playInfo.videoDuration = failDelay;
        }
    } else {
        playInfo.videoDuration = failDelay;
    }

    // 타이머 재귀 실행
    const timerObj = setTimeout(startPlayerlist, videoDuration * 1000, io, hostname);
    // 타이머 객체 저장
    playInfo.timerObj = timerObj;
};
module.exports = {
    getTimeLeft, startPlayerlist, getOrDefaultPlayInfo, deletePlayinfo, getPlayInfo
}