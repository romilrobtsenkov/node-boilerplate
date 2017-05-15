const express = require('express');
const router = express.Router();
const redis = require('../utils/redis');
const log = require('../logger');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.SECRET;
const ensureLoggedIn  = require('../utils/ensureLoggedIn');
const User = require('../models/user');

router.get('/me', ensureLoggedIn, function(req, res){

    //console.log(timeDiffInSeconds);
    User.findOne({_id: req.user.id}, function(err, user) {
        if (err) { return res.json({error: err}); }

        if(!user){
          return res.status(401).send({error: 'Unauthorized'});
        }

        var response = {
            user: user
        };

        // update if more than X seconds from last token update
        if(req.user.iat + parseInt(process.env.TOKEN_UPDATE_IN_SECONDS) <= (Date.now() / 1000)){
            log.info('token updated');

            // SAVE REVOKED token
            redis.set(JSON.stringify(req.user), req.user.id, (req.user.exp - req.user.iat));

            response.token = jwt.sign({
                id: user.id,
                ts: new Date() * 1,
                exp: Math.floor(Date.now() / 1000) + parseInt(process.env.TOKEN_EXPIRES_IN_SECONDS),
            }, jwtSecret);
        }

        return res.json(response);

    });


});

module.exports = router;
