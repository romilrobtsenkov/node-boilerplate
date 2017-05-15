const express = require('express');
const router = express.Router();
const passport = require('passport');
const redis = require('../utils/redis');
const log = require('../logger');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.SECRET;
const ensureLoggedIn  = require('../utils/ensureLoggedIn');
const getUserFromValidToken  = require('../utils/getUserFromValidToken');
const User = require('../models/user');

router.get('/google',  (req, res, next) => {
    // state: req.query.token - adding token to request if trying to link user else empty value
    passport.authenticate('google', { scope: 'profile email', state: req.query.token})(req, res, next);
});

router.get('/google/oauth2callback', getUserFromValidToken, (req, res, next) => {

    passport.authenticate('google', function(err, user, info) {
        if (err) {
            log.warning({ 'autherror': err });
            return res.redirect(process.env.SITE_URL + '/#/login?googleAuthError=' + err);
        }

        //console.log(Math.floor(Date.now() / 1000) + parseInt(process.env.TOKEN_EXPIRES_IN_SECONDS));
        var token = jwt.sign({
            id: user.id,
            ts: new Date() * 1,
            exp: Math.floor(Date.now() / 1000) + parseInt(process.env.TOKEN_EXPIRES_IN_SECONDS),
        }, jwtSecret);

        res.redirect(process.env.SITE_URL + '/#/?token='+token);
    })(req, res, next);
});

router.post('/local/login', (req, res, next) => {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();
    req.sanitize('email').normalizeEmail({ remove_dots: false });

    const errors = req.validationErrors();

    if (errors) {
        return res.json(errors);
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            return res.json({ error: info});
        }

        var token = jwt.sign({
            id: user.id,
            ts: new Date() * 1,
            exp: Math.floor(Date.now() / 1000) + parseInt(process.env.TOKEN_EXPIRES_IN_SECONDS),
        }, jwtSecret);
        res.json({token:token});

    })(req, res, next);
});

router.post('/local/signup', (req, res, next) => {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
    req.sanitize('email').normalizeEmail({ remove_dots: false });

    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).send(errors);
    }

    const user = new User({
        email: req.body.email,
        passwordparseInt: req.body.password
    });

    User.findOne({ email: req.body.email }, (err, existingUser) => {
        if (err) { return next(err); }
        if (existingUser) {
            return res.status(400).send({ error: 'Account with that email address already exists.' });
        }
        user.save((err) => {
            if (err) { return next(err); }

            return res.json({ success: "successfully created user" });
        });
    });
});

router.post('/google/unlink', ensureLoggedIn, (req, res, next) => {

    User.findOne({ _id: req.user.id }, (err, existingUser) => {
        if (err) { return next(err); }
        if (!existingUser) {
            return res.status(400).send({ error: 'No user found to unlink' });
        }

		existingUser.google = undefined;
        existingUser.save((err) => {
            if (err) { return res.status(500).send({ error: 'Unable to save unlinked user' }); }

            return res.json({ success: "successfully unlinked user" });
        });
    });
});

router.post('/logout', ensureLoggedIn, (req, res, next) => {

    // blacklist active token
    redis.set(JSON.stringify(req.user), req.user.id, (req.user.exp - req.user.iat))
        .then(function(){
            return res.json({ success: "successfully logged out" });
        });
});

module.exports = router;
