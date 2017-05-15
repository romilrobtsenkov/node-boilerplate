const redis = require('./redis');
const expressJwt = require('express-jwt');
const jwtSecret = process.env.SECRET;
const validateJwt = expressJwt({secret: jwtSecret});

module.exports = function (req, res, next) {

    validateJwt(req, res, function(err) {

        if (err) {
            // token not valid or expired
            return res.status(401).send({error: 'Unauthorized'});
        }

        // check if blacklisted
        redis.get(JSON.stringify(req.user))
            .then(function(isBlacklisted) {
                //console.log('blacklisted token tried: ', isBlacklisted);
                if(isBlacklisted){
                    return res.status(401).send({error: 'Unauthorized'});
                }

                next();
            });

    });
};
