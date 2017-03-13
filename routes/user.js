const express = require('express');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const router = express.Router();

const log = require('../logger');

const User = require('../models/user');

const jwtSecret = process.env.SECRET;
const validateJwt = expressJwt({secret: jwtSecret});

router.get('/me', validateJwt, function(req, res){

    // iat – This is the time that the token was created, as a unix timestamp offset in seconds.
    // exp – This is the time that the token expires, as a unix timestamp offset in seconds.
    // validateJwt validates if token is valid, returns req.user as object set to token

    if(!req.user){
        // never gets here acctually
        return res.status(401).send({error: 'Unauthorized'});
    }else{

        // token creation time diff, to check if token expired
        // var timeDiffInSeconds = (new Date().getTime()/1000).toFixed() - req.user.iat;

        User.findOne({_id: req.user.id}, function(err, user) {
            if (err) { return res.json({error: err}); }

            if(!user){
              return res.status(401).send({error: 'Unauthorized'});
            }

            var response = {
                user: user
            };

            log.info('token updated');
            response.token = jwt.sign({
                id: user.id
            }, jwtSecret);

            return res.json(response);

        });

    }
});

module.exports = router;
