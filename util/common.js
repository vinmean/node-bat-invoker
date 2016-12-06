var UTIL = {
    cloneObj: function(obj) {
        if (obj) {
            if (Object.keys(obj).length === 0) {
                return null;
            }
            var o = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    o[key] = obj[key];
                }
            }

            return o;
        }

        return null;
    },
    stripExcessAttrib: function(obj) {
        if (Array.isArray(obj)) {
            var js = [];
            obj.forEach(function(element) {
                var j = UTIL.cloneObj(element);
                if (j) {
                    delete j._id;
                    delete j.dir;
                }
                js.push(j);
            }, this);

            return js;
        }
        else {
            var j = UTIL.cloneObj(obj);
            if (j) {
                delete j._id;
                delete j.dir;
            }

            return j;
        }
    },
    verbNotSupported: function(req, res, next) {
        res.status(405).json({
            error: true,
            message: req.method + ' is not supported for ' + req.originalUrl
        });
    },
    shutDown: function(server) {
        const JOBS_DB = require('../persist/jobs');
        const logger = require('../util/logger');
        logger.info('util.common::shutDown() --> Shutdown signal received');
        JOBS_DB.fetchMultiObject({ running: true }, (jobs) => {
            if (jobs && jobs.length > 0) {
                logger.info('util.common::shutDown() --> Running jobs found --> ' + JSON.stringify(jobs));
                const JOBS_PROCESS = require('../process/jobs');
                jobs.forEach(function(job) {
                    if (job && job.batch) {
                        JOBS_PROCESS.killJob(job.batch.pid, () => {
                            logger.info('util.common::shutDown() --> Process with pid = ' + job.batch.pid + ' is killed');
                            job.running = false;
                            job.status = 'ABORTED-BY-SHUTDOWN';
                            job.exitCode = 1;
                            setTimeout(() => {
                                JOBS_DB.saveObject(job);
                            }, parseInt(process.env.APP_KILL_UPDATE_WAIT_PERIOD || '1') * 1000);
                        });
                    }
                }, this);

                server.close(function() {
                    logger.info("Closed out remaining connections.");
                    process.exit(0);
                });

                // if after 
                setTimeout(function() {
                    logger.error("Could not close connections in time, forcefully shutting down");
                    process.exit(1);
                }, parseInt(process.env.APP_FORCE_SHUT_DOWN_WAIT_PERIOD || '10') * 1000);
            }
            else {
                logger.info('util.common::shutDown() --> No running jobs found. Exiting...');
                server.close(function() {
                    logger.info("Closed out remaining connections.");
                    process.exit(0);
                });

                // if after 
                setTimeout(function() {
                    logger.error("Could not close connections in time, forcefully shutting down");
                    process.exit(1);
                }, parseInt(process.env.APP_FORCE_SHUT_DOWN_WAIT_PERIOD || '10') * 1000);
                
            }
        });
    }
};

module.exports = UTIL;