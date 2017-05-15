const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');
const log = require('./logger');
const nodemailer = require('nodemailer');
const expressValidator = require('express-validator');
const passportUtil = require('./utils/passportAuth');

/* Load config */
const dotenv = require('dotenv');
dotenv.load({ path: '.env' });

/* connect to db */
mongoose.connect(process.env.MONGODB_URI);

/* Define app */
const app = express();

app.use(expressValidator());
app.use(log.middleWare());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
const user = require('./routes/user');
app.use('/api/user', user);
const auth = require('./routes/auth');
app.use('/api/auth', auth);
const restricted = require('./routes/restricted');
app.use('/api/restricted', restricted);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
app.use(function(err, req, res, next) {
    log.error(err);

    res.status(err.status || 500).
    json({
        status: err.status || 500,
        message: err.message || 'Unknown errror',
    });
});

// https://strongloop.com/strongblog/robust-node-applications-error-handling/
if (process.env.PRODUCTION) {
    process.on('uncaughtException', function (err) {
        log.error(err.stack);

        var transport = nodemailer.createTransport();

        transport.sendMail({
            from: process.env.EMAIL,
            to: process.env.DEV_EMAIL,
            subject: '['+process.env.APP_NAME+'][uncaughtException] - '+err.message,
            text: err.stack
        }, function (err) {
            if (err) log.error(err);
            log.warning('Email sent to developer about error');
            process.exit(1);
        });

    });
}

module.exports = app;
