const express = require('express');

const path = require('path');
const favicon = require('serve-favicon');
const logger = require('./util/logger');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const morgan = require('morgan');

const jobs = require('./routes/jobs.js');
const processes = require('./routes/processes');
const code = require('./routes/code.js');
const BASE_DIR = require('./util/baseDir').BASE_DIR;
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(morgan("short", { "stream": logger.stream }));

app.use('/listing',
    serveIndex(
        BASE_DIR,
        {
            icons: true,
            stylesheet: 'public/stylesheets/si-style.css',
            view: 'details'
        }
    )
);

app.use('/listing', express.static(BASE_DIR));
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.use('/jobs', jobs);
app.use('/processes', processes);
app.use('/code', code);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => {
        logger.error(err);
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
