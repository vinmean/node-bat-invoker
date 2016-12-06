const cp = require('child_process');
const logger = require('../util/logger');
const uuid = require('uuid');
const BASE_DIR = require('../util/baseDir').BASE_DIR;

var CODE_PROCESS = {
    refresh: function(){
        logger.debug('process.code::refresh() --> started');
        var batchParams = ["/c", BASE_DIR + "invoker\\refresh.bat", BASE_DIR, uuid.v4()];
        var batch = cp.spawn("cmd.exe", batchParams);
        logger.debug('process.code::refresh() --> Started cmd.exe ' + batchParams.toString());

        batch.on('exit', (code) => {
            logger.debug('process.code::refresh() --> completed ');
        });

        return { pid: batch.pid };
    }
};

module.exports = CODE_PROCESS;