const Rooms = require('models/room');
const Accounts = require('models/account');

let isPlaying = {};

const startPlayerlist = async (hostname, room_id) => {
    // playerlist 실행중으로 바꾸기
    isPlaying[hostname] = [true, null];

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
        isPlaying[hostname][0] = false;
        console.log(hostname + ' 방의 playerlist 멈춤')
        return;
    }

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

    // firstPlayer의 firstVideo가 있으면
    if (firstVideo !== undefined) {
        console.log(firstPlayer.username + ' 의 playlist \'' + account.playlists[selectedPlaylist].name + '\' 의 ' + firstVideo.videoTitle + ' 이 재생중');

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
    } else {
        console.log(firstPlayer.username + ' 의 ' + account.playlists[selectedPlaylist].name + ' 에 동영상이 없음')
        // io.emit 으로 대기열에서 나가졌다고 알리기
    }

    const timerObj = setTimeout(startPlayerlist, 3000, hostname, room_id);
    isPlaying[hostname][1] = timerObj;
};
module.exports = {
    isPlaying, startPlayerlist
}