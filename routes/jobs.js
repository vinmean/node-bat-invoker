const express = require('express');
var router = express.Router();
const uuid = require('uuid');
const BASE_DIR = require('../util/baseDir').BASE_DIR;
const logger = require('../util/logger');
const JOBS_DB = require('../persist/jobs');
const JOBS_PROCESS = require('../process/jobs');
const COMMON = require('../util/common');

router.param('jobId', (req, res, next, jobId) => {
    var job = paramsToObj(req, req.job);
    if (job) {
        req.job = job;
    }

    next();
});

router.param('bat', (req, res, next, bat) => {
    var job = paramsToObj(req, req.job);
    if (job) {
        req.job = job;
    }

    next();
});

router.route('/')
    //get all jobs
    .get(getAllJobs)
    // post using request body instead of path param
    .post(postJob)
    .delete(deleteAllJobs)
    .put(COMMON.verbNotSupported);

router.route('/:db/:bat')
    // get details of the job
    .get(getJob)
    // post job using path param
    .post(postJob)
    // delete job using path param
    .delete(deleteJob)
    .put(putJob);

router.route('/:jobId')
    .get(getJob)
    .post(COMMON.verbNotSupported)
    // delete job using path param jobId
    .delete(deleteJob)
    .put(putJob);

function getJobFile(db, bat) {
    return getJobDir(db) + '\\' + bat + '.bat';
}

function getJobDir(db) {
    return BASE_DIR + db;
}

// Methods supporting HTTP operations
function getAllJobs(req, res, next) {
    fetchAll((jobs) => {
        if (jobs) {
            logger.debug('routes.jobs::getAllJobs() --> Retrieved ' + jobs.length + ' jobs --> ' + JSON.stringify(jobs));
            for (var i = 0; i < jobs.length; i++) {
                jobs[i] = COMMON.stripExcessAttrib(jobs[i]);
                logger.debug('routes.jobs::getAllJobs() --> After _id deletion, job --> ' + JSON.stringify(jobs[i]));
            }
            logger.debug('routes.jobs::getAllJobs() --> After _id deletion jobs --> ' + JSON.stringify(jobs));
            res.status(200).json(jobs);
            return;
        }
        else {
            res.status(200).json(
                []
            );
            return;
        }
    });
}

function getJob(req, res, next) {
    var paramJob = req.job;

    fetchJob(COMMON.stripExcessAttrib(paramJob), (outJob) => {
        if (outJob) {
            res.status(200).json(COMMON.stripExcessAttrib(outJob));
            return;
        }
        else {
            var error = {
                error: true,
                message: 'No job record found for input ' + JSON.stringify(paramJob)
            };
            logger.error(error);
            res.status(404).json(
                error
            );
            return;
        }
    });
}

function postJob(req, res, next) {
    var paramJob = null;
    if (req.job) {
        paramJob = req.job;
    }
    else if (req.body) {
        if (req.body.db && req.body.bat) {
            paramJob = {
                jobFile: getJobFile(req.body.db, req.body.bat)
            };
            if (req.body.params) {
                paramJob.params = req.body.params;
            }
        }
        else {
            res.status(400).json({
                error: true,
                message: 'job details {db: "", bat: ""} required as body or path parameter'
            });
            return;
        }
    }
    else {
        res.status(400).json({
            error: true,
            message: 'job details {db: "", bat: ""} required as body or path parameter'
        });
        return;
    }

    logger.debug('routes.jobs::postJob() --> paramJob = ' + JSON.stringify(paramJob));

    // Check if there is a job already
    fetchJob(COMMON.stripExcessAttrib(paramJob), (job) => {
        // a job is found
        if (job) {
            // send back conflict
            res.status(409).json(COMMON.stripExcessAttrib(job));
            return;
        }
        else {
            // Create a new job 
            if (paramJob.jobFile) {
                var jobId = uuid.v4();
                var batch = submitJobBatch(paramJob.jobFile, jobId, paramJob.dir, paramJob.params);
                var newJob =
                    {
                        jobFile: paramJob.jobFile,
                        jobId: jobId,
                        dir: paramJob.dir,
                        batch: batch,
                        running: true,
                        status: 'STARTED',
                        params: paramJob.params
                    };
                persistJob(newJob, (savedJob) => {
                    res.status(201).json(COMMON.stripExcessAttrib(savedJob));
                });
            }
            else {
                res.status(400).json(
                    {
                        error: true,
                        message: 'Job file information is missing!!!'
                    }
                );
                return;
            }

        }
    });
}

function putJob(req, res, next) {
    var paramJob = null;
    if (req.job) {
        paramJob = req.job;
    }
    else {
        res.status(400).json({
            error: true,
            message: 'job details {db: "", bat: ""} required as body or path parameter'
        });
        return;
    }

    logger.debug('routes.jobs::putJob() --> paramJob = ' + JSON.stringify(paramJob));

    // Check if there is a job already
    fetchJob(COMMON.stripExcessAttrib(paramJob), (job) => {
        // a job is found
        if (job) {
            // is it running
            if (job.running) {
                // send back conflict
                res.status(409).json(COMMON.stripExcessAttrib(job));
                return;
            }
            else {
                job.jobId = uuid.v4();
                job.batch = submitJobBatch(job.jobFile, job.jobId, job.dir, job.params);
                job.running = true;
                job.status = 'STARTED';
                persistJob(job, (savedJob) => {
                    res.status(201).json(COMMON.stripExcessAttrib(savedJob));
                });
            }
        }
        else {
            res.status(404).json(
                {
                    error: true,
                    message: 'Job ' + JSON.stringify(paramJob) + ' not found'
                }
            );
            return;
        }
    });
}

function deleteJob(req, res, next) {
    var paramJob = req.job;

    fetchJob(COMMON.stripExcessAttrib(paramJob), (job) => {
        if (job) {
            // is the job running?
            if (job.running) {
                // does it have process id
                if (job.batch) {
                    // then kill the process
                    killJobBatch(job.jobFile, job.jobId, job.batch.pid,
                        () => {
                            logger.info('routes.jobs::killJobBatch() --> callback --> Job ' + JSON.stringify(job) + ' is now aborted.');
                            removeJob(job, (job) => {
                                job.running = false;
                                job.exitCode = 1;
                                job.status = 'ABORTED';
                                logger.info('routes.jobs::removeJob() --> callback --> Job ' + JSON.stringify(job) + ' is now deleted. Return the status');
                                res.status(200).json(COMMON.stripExcessAttrib(job));
                            });
                        });
                    return;
                }
            }
            job.running = false;
            removeJob(job, (job) => {
                res.status(200).json(COMMON.stripExcessAttrib(job));
            });
            return;
        }
        else {
            logger.info('routes.jobs::deleteJob() --> Job ' + JSON.stringify(paramJob) + ' was not found. It may have been deleted');
            res.status(204).end();
            return;
        }
    });
}

function deleteAllJobs(req, res, next) {
    fetchJob({ running: true }, (jobs) => {
        if (jobs) {
            // running job found. raise a conflict
            res.status(409).json(COMMON.stripExcessAttrib(jobs));
        }
        else {
            // No running jobs. Existing jobs can be deleted
            removeAllJob((numRemoved) => {
                if (numRemoved > 0) {
                    res.status(200).json({ removedCount: numRemoved });
                    return;
                }
                else {
                    res.status(204).end();
                    return;
                }
            });
        }
    });
}

// JSON
function jobJson(jobFile, jobId, dir, batch, running, status, exitCode) {
    var job = {};
    var attribs = ['jobFile', 'jobId', 'dir', 'batch', 'running', 'status', 'exitCode'];

    for (
        var index = 0;
        ((index < arguments.length) && (index < attribs.length));
        index++
    ) {
        job[attribs[index]] = arguments[index];
    }

    return job;
}

function paramsToObj(req, obj) {
    var o = obj || {};

    if (req.params.jobId) {
        logger.debug('routes.jobs::paramsToObj() --> jobId param is ' + req.params.jobId);
        o.jobId = req.params.jobId;
    }

    if (req.params.db && req.params.bat) {
        logger.debug('routes.jobs::paramsToObj() --> db param is ' + req.params.db);
        logger.debug('routes.jobs::paramsToObj() --> bat param is ' + req.params.bat);

        o.jobFile = getJobFile(req.params.db, req.params.bat);
        o.dir = getJobDir(req.params.db);
    }

    if (Object.keys(o).length === 0) {
        o = null;
    }

    if (o) {
        if (req.body && req.body.params) {
            o.params = req.body.params;
        }
    }

    logger.debug('routes.jobs::paramsToObj() --> Request parameters converted to object --> ' + JSON.stringify(o));
    return o;
}

// Batch file invocation and child process methods
function submitJobBatch(jobFile, jobId, dir, params) {
    logger.debug('routes.jobs::submitJobBatch() --> params --> ' + jobFile + ' | ' + jobId + ' | ' + dir);
    // Callback for the submitJob() is invoked when the process ends
    return JOBS_PROCESS.submitJob(jobFile, jobId, dir, (code) => {
        logger.info('routes.jobs::submitJobBatch() --> Job = ' + jobFile + ' and jobId = ' + jobId + ' is completed. Check if the job exists in db to update the details');
        // At this point check the db if the record still exists
        fetchJob({ jobFile: jobFile, jobId: jobId }, (outJob) => {

            if (outJob) {
                logger.info('routes.jobs::submitJobBatch() --> Was able to fetch job details for jobFile = ' +
                    jobFile +
                    ' and jobId = ' + jobId +
                    ' Job details would be updated with exit status');
                outJob.running = false;
                outJob.exitCode = code;
                outJob.status = (code > 0) ? 'ERROR' : 'SUCCESS';
                // Update the record
                persistJob(outJob, (savedJob) => {
                    logger.info('routes.jobs::submitJobBatch() --> Job --> ' + JSON.stringify(savedJob) + ' ended and exit status updated');
                });
            }
            else {
                logger.info('routes.jobs::submitJobBatch() --> Was not able to fetch job details from DB for jobFile = ' +
                    jobFile +
                    ' and jobId = ' +
                    jobId +
                    ' It may have been already deleted');
            }
        });

    }, params);
}

function killJobBatch(jobFile, jobId, pid, callback) {
    JOBS_PROCESS.killJob(pid, () => {
        logger.info('routes.jobs::killJobBatch() --> Job ' + jobFile + ' and jobId = ' + jobId + ' and pid = ' + pid + ' is killed');
        callback();
    });
}

// Persistence methods
function fetchJob(job, callback) {
    JOBS_DB.fetchObject(job, callback);
}

function fetchMultiJobs(query, callback) {
    JOBS_DB.fetchMultiObject(query, callback);
}

function fetchAll(callback) {
    JOBS_DB.fetchAll(callback);
}

function persistJob(job, callback) {
    JOBS_DB.saveObject(job, callback);
}

function removeJob(job, callback) {
    JOBS_DB.deleteObject(job, callback);
}

function removeAllJob(callback) {
    JOBS_DB.deleteAll(callback);
}
module.exports = router;