const express = require('express');
const expressJwt = require('express-jwt');
const router = express.Router();
const log = require('../logger');

const jwtSecret = process.env.SECRET;
const validateJwt = expressJwt({secret: jwtSecret});

router.get('/', validateJwt, function(req, res){
    log.info(req.user.id);
    res.json({secret: "secret"});
});

module.exports = router;
