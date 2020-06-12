const getTimeLeft = timeout => {
    const timeleft = Math.ceil((timeout._idleStart + timeout._idleTimeout) / 1000 - process.uptime());
    //console.log(timeleft);
    return timeleft;
}
exports.getTimeLeft = getTimeLeft;