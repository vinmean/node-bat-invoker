var ENV = {
    loadVars: function(filepath) {
        const fs = require('fs');
        var data = fs.readFileSync(filepath, 'utf8');
        if (data) {
            var tokens = [];
            if (data.indexOf('\r\n') >= 0) {
                tokens = data.split('\r\n');
            }
            else if (data.indexOf('\n') >= 0) {
                tokens = data.split('\n');
            }
            else {
                tokens.push(data);
            }
            var special = /\W/;
            for (var index = 0; index < tokens.length; index++) {
                var element = tokens[index];
                var split = element.split('=');
                if (split.length === 2) {
                    if (special.test(split[0])) {
                        console.warn('Env variable supplied contains special characters => ' + split[0]);
                    }
                    else {
                        process.env[split[0]] = split[1];
                        console.log('process.env.' + split[0] + ' => ' + process.env[split[0]]);
                    }
                }
            }
        }
    }
};

module.exports = ENV;
