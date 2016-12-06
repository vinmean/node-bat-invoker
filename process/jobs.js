const cp = require('child_process');
const logger = require('../util/logger');

var JOB_PROCESS = {
    submitJob: function(jobFile, jobId, dir, callback, optArrParams) {
        logger.debug('process.jobs::submitJob() --> params --> ' + jobFile + ' | ' + jobId + ' | ' + dir + (optArrParams ? ' | ' + JSON.stringify(optArrParams) : ''));
        var batchParams = ["/c", jobFile, dir, jobId];
        if (optArrParams){
            if (Array.isArray(optArrParams)){
                Array.prototype.push.apply(batchParams, optArrParams);
            }
            else{
                batchParams.push(optArrParams);
            }
        }
        var batch = cp.spawn("cmd.exe", batchParams);
        logger.debug('process.jobs::submitJob() --> Started cmd.exe /c ' + jobFile + ' ' + dir + ' ' + jobId + ' with pid = ' + batch.pid);

        batch.on('exit', (code) => {
            callback(code);
        });
        //logger.debug(JSON.stringify(batch));
        return { pid: batch.pid };
    },
    killJob: function(pid, callback) {
        var killer = cp.spawnSync("cmd.exe", ["/c", "kill.bat", pid]);
        logger.info('process.jobs::killJob() --> Killed process with id = ' + pid);
        callback();
    }
};

module.exports = JOB_PROCESS;