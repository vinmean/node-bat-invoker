const express = require('express');
const router = express.Router();
const CODE_PROCESS = require('../process/code');
const COMMON = require('../util/common');
const logger = require('../util/logger');
const BASE_DIR = require('../util/baseDir').BASE_DIR;

// Multer package handles file upload. This will be used to refresh code remotely
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, BASE_DIR);
    },
    filename: function (req, file, callback) {
        callback(null, 'code.zip');
    }
});

var upload = multer(
    {
        storage: storage,
        fileFilter: function (req, file, cb) {

            // The function should call `cb` with a boolean
            // to indicate if the file should be accepted

            logger.debug("routes.code.upload.fileFilter() --> Uploaded file mimetype is " + file.mimetype);
            // To reject this file pass `false`, like so:
            if (!((file.mimetype === 'application/x-zip-compressed') ||
                (file.mimetype === 'application/zip'))) {
                logger.debug("routes.code.upload.fileFilter() --> Uploaded file mimetype is NOT application/zip");
                //cb(null, false);
                cb(new Error('Only zip files are allowed to be uploaded'));
            }
            else {
                // To accept the file pass `true`, like so:
                cb(null, true);
            }

            // You can always pass an error if something goes wrong:
            //cb(new Error('I don\'t have a clue!'))

        },
        limits: { fileSize: 1024*1024*30}
    })
    .single('codeZipFile'); // Form/request field element name

router.route('/')
    .post(refresh)
    .get(COMMON.verbNotSupported)
    .delete(COMMON.verbNotSupported)
    .put(COMMON.verbNotSupported);

function refresh(req, res) {
    logger.debug('routes.code.refresh() --> Received request for file upload. passing to multer');
    
    upload(req, res, function (err) {
        if (err) {
            return res.end(err.message);
        }
        res.end("File is uploaded");
        CODE_PROCESS.refresh();
    });
}
module.exports = router;