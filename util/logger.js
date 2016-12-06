var winston = require('winston');
var os = require('os');

function customTimeStamp() {
    return '[ ' + new Date().toLocaleString() + ' ]';
}

function logDir() {
    var dir = process.env.APP_LOG_DIR || (process.env.APP_BASE_DIR + '\\logs\\');

    if (!dir.endsWith('\\')) {
        return dir + '\\';
    }

    return dir;
}

var logger = new (winston.Logger)({
    transports: [
        new winston.transports.Console({
            colorize: true,
            prettyPrint: true,
            timestamp: customTimeStamp,
            humanReadableUnhandledException: true
        }),
        new winston.transports.File({
            name: 'debug-file',
            filename: logDir() + os.hostname() + '-debug.log',
            level: 'debug',
            json: false,
            prettyPrint: true,
            maxsize: 1048576,
            maxFiles: 30,
            timestamp: customTimeStamp,
            zippedArchive: true
        }),
        new winston.transports.File({
            name: 'info-file',
            filename: logDir() + os.hostname() + '.log',
            level: 'info',
            json: false,
            prettyPrint: true,
            maxsize: 1048576,
            maxFiles: 30,
            timestamp: customTimeStamp,
            zippedArchive: true
        })
    ],

    exceptionHandlers: [
        new winston.transports.Console({
            colorize: true,
            prettyPrint: true,
            timestamp: customTimeStamp,
            humanReadableUnhandledException: true
        }),
        new winston.transports.File({
            filename: logDir() + os.hostname() + '-exceptions.log',
            json: false,
            prettyPrint: true,
            maxsize: 1048576,
            maxFiles: 30,
            timestamp: customTimeStamp,
            zippedArchive: true
        })
    ],

    exitOnError: false
});

logger.stream = {
    write: function (message, encoding) {
        logger.info(message);
    }
};

module.exports = logger;