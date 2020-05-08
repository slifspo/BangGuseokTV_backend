/* 
    File upload 
 */
const fs = require('fs');
const path = require('path');
const upload = {
    UPLOAD: '/upload',
    IMAGE: '/image/',
    FILE: '/file/',
    MAXFILESIZE: 200 * 1024 * 1024, //Upload file size
}
// Create a file directory
const mkdirFile = (path) => {
    let pathList = path.split('\\');
    let fileDir = ''
    pathList.forEach(value => {
        if (value) {
            fileDir += (value + '/')
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, err => {
                    LogFile.info('Create failure', err)
                    return
                });
            }
        }
    })
}

//Save file
const saveFile = (file, path) => {
    return new Promise((resolve, reject) => {
        let render = fs.createReadStream(file);
        // Create a write stream
        let upStream = fs.createWriteStream(path);
        render.pipe(upStream);
        upStream.on('finish', () => {
            resolve(path)
        });
        upStream.on('error', (err) => {
            reject(err)
        });
    })
}

module.exports = {
    mkdirFile, saveFile
};