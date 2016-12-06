var BASE_DIR = require('../util/baseDir').BASE_DIR;
const hostname = require('os').hostname();
const logger = require('../util/logger');
const UTIL = require('../util/common');

var Datastore = require('nedb'),
    jobsDB = new Datastore({ filename: process.env.APP_DB_DIR + hostname + '-JOBS-DB.db' });

jobsDB.loadDatabase((err) => {    // Callback is optional
    if (err) {
        logger.error(err);
        process.exit(1);
    }
    // Now commands will be executed
});

jobsDB.ensureIndex({ fieldName: 'jobFile', unique: true }, function (err) {
});

jobsDB
    .persistence
    .setAutocompactionInterval(parseInt(process.env.APP_DB_COMPACTION_INTERVAL || '1800000'));

var PERSISTENCE = {
    saveObject: (doc, successCallback, errorCallback) => {
        logger.info('persist.jobs::saveObject() --> Save ' + JSON.stringify(doc));
        jobsDB.update(
            {
                jobFile: doc.jobFile
            },
            doc,
            {
                upsert: true
            },
            (err, numReplaced) => {
                if (err) {
                    if (errorCallback) {
                        errorCallback(err);
                    }
                    else {
                        logger.error(err);
                        throw err;
                    }
                }

                logger.info('persist.jobs::saveObject() --> Upserted ' + numReplaced);

                if (successCallback) {
                    successCallback(doc);
                }
            });
    },
    fetchObject: (query, successCallback, errorCallback) => {
        logger.info('persist.jobs::fetchObject() --> Query ' + JSON.stringify(query));
        jobsDB.findOne(query, (err, doc) => {
            if (err) {
                if (errorCallback) {
                    errorCallback(err);
                }
                else {
                    logger.error(err);
                    throw err;
                }
            }
            logger.info('persist.jobs::fetchObject() --> Fetched ' + JSON.stringify(doc));

            if (successCallback) {
                successCallback(doc);
            }
        });
    },
    fetchMultiObject: (query, successCallback, errorCallback) => {
        logger.info('persist.jobs::fetchMultiObject() --> Query ' + JSON.stringify(query));
        jobsDB.find(query, (err, docs) => {
            if (err) {
                if (errorCallback) {
                    errorCallback(err);
                }
                else {
                    logger.error(err);
                    throw err;
                }
            }
            if (docs) {
                logger.info('persist.jobs::fetchMultiObject() --> Fetched ' + docs.length + ' jobs --> ' + JSON.stringify(docs));
            }

            if (successCallback) {
                successCallback(docs);
            }
        });
    },
    fetchAll: (successCallback, errorCallback) => {
        jobsDB.find({ jobId: { $exists: true } }, (err, docs) => {
            if (err) {
                if (errorCallback) {
                    errorCallback(err);
                }
                else {
                    logger.error(err);
                    throw err;
                }
            }
            if (docs) {
                logger.info('persist.jobs::fetchAll() --> Fetched ' + docs.length + ' jobs --> ' + JSON.stringify(docs));
            }


            if (successCallback) {
                successCallback(docs);
            }
        });
    },
    deleteObject: (doc, successCallback, errorCallback) => {
        logger.info('persist.jobs::deleteObject() --> Remove ' + JSON.stringify(doc));

        var query = {};
        if (doc._id) {
            query._id = doc._id;
        }
        else {
            query.jobFile = doc.jobFile;
        }

        jobsDB.remove(
            query,
            {},
            (err, numRemoved) => {
                if (err) {
                    if (errorCallback) {
                        errorCallback(err);
                    }
                    else {
                        logger.error(err);
                        throw err;
                    }
                }
                logger.info('persist.jobs::deleteObject() --> Removed ' + numRemoved + ' records of ' + JSON.stringify(doc));
                if (successCallback) {
                    successCallback(doc);
                }
            });
    },
    deleteAll: (successCallback, errorCallback) => {
        jobsDB.remove(
            {}, { multi: true },
            (err, numRemoved) => {
                if (err) {
                    if (errorCallback) {
                        errorCallback(err);
                    }
                    else {
                        logger.error(err);
                        throw err;
                    }
                }
                logger.info('persist.jobs::deleteAll() --> Removed ' + numRemoved + ' records from database');
                // Compact database now as all records are deleted
                jobsDB
                    .persistence.compactDatafile();
                if (successCallback) {
                    successCallback(numRemoved);
                }

            });
    }
};

module.exports = PERSISTENCE;