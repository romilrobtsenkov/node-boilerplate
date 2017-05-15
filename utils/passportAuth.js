const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const log = require('../logger');
const User = require('../models/user');

/**
* Sign in using Email and Password.
*/
passport.use(new LocalStrategy({ usernameField: 'email', session: false }, (email, password, done) => {
    User.findOne({ email: email.toLowerCase() }, (err, user) => {
        if (err) { return done(err); }
        if (!user) {
            return done(null, false, { msg: `Email ${email} not found.` });
        }
        user.comparePassword(password, (err, isMatch) => {
            if (err) { return done(err); }
            if (isMatch) {
                return done(null, user);
            }
            return done(null, false, { msg: 'Invalid email or password.' });
        });
    });
}));

/**
* Sign in with Google.
*/
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
}, (req, accessToken, refreshToken, profile, done) => {

    if (req.user) {
        User.findOne({ google: profile.id }, (err, existingUser) => {
            if (err) { return done(err); }
            if (existingUser) {
                let warning = 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.';
                log.warning(warning);
                done(warning);
            } else {
                User.findById(req.user.id, (err, user) => {
                    if (err) { return done(err); }
                    user.google = profile.id;
                    //user.tokens.push({ kind: 'google', accessToken });
                    user.profile.name = user.profile.name || profile.displayName;
                    user.profile.gender = user.profile.gender || profile._json.gender;
                    user.profile.picture = user.profile.picture || profile._json.image.url;
                    user.save((err) => {
                        log.info('Google account has been linked.');
                        done(err, user);
                    });
                });
            }
        });
    } else {
        User.findOne({ google: profile.id }, (err, existingUser) => {
            if (err) { return done(err); }
            if (existingUser) {
                return done(null, existingUser);
            }
            User.findOne({ email: profile.emails[0].value }, (err, existingEmailUser) => {
                if (err) { return done(err); }
                if (existingEmailUser) {
                    let warning = 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.';
                    log.warning(warning);
                    done(warning);
                } else {
                    const user = new User();
                    user.email = profile.emails[0].value;
                    user.google = profile.id;
                    //user.tokens.push({ kind: 'google', accessToken });
                    user.profile.name = profile.displayName;
                    user.profile.gender = profile._json.gender;
                    user.profile.picture = profile._json.image.url;
                    user.save((err) => {
                        done(err, user);
                    });
                }
            });
        });
    }
}));
