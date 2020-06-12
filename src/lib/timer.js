const getTimeLeft = timeout => {
    return Math.ceil((timeout._idleStart + timeout._idleTimeout) / 1000 - process.uptime());
}
exports.getTimeLeft = getTimeLeft;