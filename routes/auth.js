const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

const log = require('../logger');

const jwtSecret = process.env.SECRET;

router.get('/google', passport.authenticate('google', { scope: 'profile email' }));

router.get('/google/oauth2callback', (req, res, next) => {

    passport.authenticate('google', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            req.flash('errors', info);
            return res.redirect('/login');
        }
        var token = jwt.sign({
            id: user.id
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
        req.logIn(user, { session: false }, (err) => {
            if (err) { return next(err); }

            var token = jwt.sign({
                id: user.id
            }, jwtSecret);
            res.json({token:token});
        });
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
        password: req.body.password
    });

    User.findOne({ email: req.body.email }, (err, existingUser) => {
        if (err) { return next(err); }
        if (existingUser) {
            return res.status(400).send({ error: 'Account with that email address already exists.' });
        }
        user.save((err) => {
            if (err) { return next(err); }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }

                return res.json({ success: "successfully created user" });
            });
        });
    });
});

module.exports = router;
