var APP_BASE_DIR = {
    BASE_DIR: (function() {
        var fs = require('fs');

        var baseDir = process.env.APP_BASE_DIR || 'C:\\DIY\\';
        try {
            fs.accessSync(baseDir);
        } catch (error) {
            throw new Error('Base directory ' + baseDir + ' cannot be accessed');
        }
        if (!baseDir.endsWith('\\')) {
            return baseDir + '\\';
        }
        return baseDir;
    })()
};

module.exports = APP_BASE_DIR;