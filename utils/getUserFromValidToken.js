const redis = require('./redis');
const expressJwt = require('express-jwt');
const jwtSecret = process.env.SECRET;
const validateJwtFromState = expressJwt({
    secret: jwtSecret,
    getToken: function fromHeaderOrQuerystring (req) { return req.query.state; }
});

module.exports = function (req, res, next) {

    // if no token just proceed
    if(!req.query || !req.query.state){
        return next();
    }

    validateJwtFromState(req, res, function(err) {

        if (err) {
            return res.status(401).send({error: 'Unauthorized'});
        }

        // check if blacklisted
        redis.get(JSON.stringify(req.user))
            .then(function(isBlacklisted) {
                // console.log('blacklisted token tried: ', isBlacklisted);
                if(isBlacklisted){
                    return res.status(401).send({error: 'Unauthorized'});
                }

                next();
            });

    });
};
