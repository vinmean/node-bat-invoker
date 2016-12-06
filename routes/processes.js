const express = require('express');
const router = express.Router();
const JOBS_PROCESS = require('../process/jobs');
const JOBS_DB = require('../persist/jobs');
const COMMON = require('../util/common');
const logger = require('../util/logger');

router.route('/')
    //get all jobs
    .get(COMMON.verbNotSupported)
    // post using request body instead of path param
    .post(COMMON.verbNotSupported)
    .delete(deleteAllProcesses)
    .put(COMMON.verbNotSupported);

router.route('/:pid')
    //get all jobs
    .get(COMMON.verbNotSupported)
    // post using request body instead of path param
    .post(COMMON.verbNotSupported)
    .delete(deleteProcess)
    .put(COMMON.verbNotSupported);

// Methods supporting HTTP operations
function deleteProcess(req, res, next) {
    var pid = parseInt(req.params.pid);

    JOBS_PROCESS.killJob(pid, () => {
        logger.info('routes.processes::deleteProcess() --> Process with pid = ' + pid + ' is killed');
        var query = { "batch.pid": pid };
        logger.info('routes.processes::deleteProcess() --> query --> ' + JSON.stringify(query));

        JOBS_DB.fetchObject(query, (job) => {
            if (job) {
                job.running = false;
                job.status = 'ABORTED';
                job.exitCode = 1;

                res.status(200).json(COMMON.stripExcessAttrib(job));
                setTimeout(() => {
                    JOBS_DB.saveObject(job, (savedJob) => {
                        logger.info('routes.processes::deleteProcess() --> ' +
                            ' Job ' +
                            JSON.stringify(job) +
                            ' updated');
                    });
                }, parseInt(process.env.APP_KILL_UPDATE_WAIT_PERIOD || '1') * 1000);
            }
            else {
                res.status(204).end();
                return;
            }
        });
    });
}

function deleteAllProcesses(req, res, next) {
    JOBS_DB.fetchMultiObject({ running: true }, (jobs) => {
        if (jobs && jobs.length > 0) {
            jobs.forEach(function(job) {
                if (job && job.batch) {
                    JOBS_PROCESS.killJob(job.batch.pid, () => {
                        logger.info('routes.processes::deleteAllProcesses() --> Process with pid = ' + job.batch.pid + ' is killed');
                        job.running = false;
                        job.status = 'ABORTED';
                        job.exitCode = 1;
                        setTimeout(() => {
                            JOBS_DB.saveObject(job, (savedJob) => {
                                logger.info('routes.processes::deleteProcess() --> ' +
                                    ' Job ' +
                                    JSON.stringify(job) +
                                    ' updated');
                            });
                        }, parseInt(process.env.APP_KILL_UPDATE_WAIT_PERIOD || '1') * 1000);
                    });
                }
            }, this);
            res.status(200).json(COMMON.stripExcessAttrib(jobs));
        }
        else {
            res.status(204).end();
            return;
        }
    });
}
module.exports = router;