const Promise = require('bluebird');
const redis = require('redis');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const client = redis.createClient({host: process.env.REDIS_HOST, port: process.env.REDIS_PORT});

module.exports = {
        get: function (key) {
            return client.getAsync(key).then(value => JSON.parse(value));
        },
        set: function (key, value, expire) {
            let promise = client.setAsync(key, JSON.stringify(value));
            if (expire) {
                promise.then(function () {
                    return client.expireAsync(key, expire);
                });
            }
            return promise;
        },
        del: function (key) {
            return client.delAsync(key);
        }
};
