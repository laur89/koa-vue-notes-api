// TODO: deleteme, superseded by repos
import shortid from 'shortid';
import _ from 'lodash';
import client from './redisClientProvider.js';

const expSeconds = (days = 30) => {
    const secondsPerDay = 86400;
    return days * secondsPerDay;
};

const buildId = () => shortid.generate();

const stringify = {
    string: data => data,
    number: data => data.toString(),
    date: data => new Date(data).toISOString(),
    time: data => new Date(data).toISOString(),
    object: data => JSON.stringify(data),
};

const parsify = {
    string: data => data,
    number: data => parseInt(data, 10),
    date: data => new Date(data),
    time: data => new Date(data),
    object: data => JSON.parse(data),
};

// TODO: https://nmajor.com/posts/simple-object-storage-in-redis-and-node
// in addition to index{} in passed schema, maybe we should not pass attributes, but instead
// read() & write() functions to io to-from redis?
export default class RedisModel {
    constructor(schema) {
        this.schema = schema;
    }

    _buildRedisKey(id) {
        return `${this.schema.namespace}:${id}`;
    }

    _buildIndexName(indexName) {
        return `${this.schema.namespace}:${indexName}`;
    }

    _unpackHashValues(data) {
        const { schema: { attributes } } = this.props;
        const obj = {};

        _.each(data, (value, key) => {
            const type = (attributes[key] || {}).kind;
            if (!type) return null;

            obj[key] = parsify[type](value);
            return null;
        });

        return _.isEmpty(obj) ? undefined : obj;
    }

    _clearOldIndexes(indexName) {
        return new Promise((resolve, reject) => {
            const now = new Date().getTime();
            const secondsPerDay = 86400;
            const args = [
                this._buildIndexName(this.schema, indexName),
                (now + (expSeconds() - secondsPerDay) * 1000),
                '-inf',
            ];

            client.zremrangebyscore(args, (err, results) => {
                if (err) return reject(err);

                return resolve(results);
            });
        });
    }

    _getIndexedIds(indexName, offset, limit) {
        return this._clearOldIndexes(indexName)
            .then(() => new Promise((resolve, reject) => {
                const args = [indexName, '+inf', '-inf', 'LIMIT', offset || 0, limit || 20];

                client.zrevrangebyscore(args, (err, results) => {
                    if (err) return reject(err);

                    return resolve(results);
                });
            }));
    }

    create(chartId, seriesId, data) {
        return new Promise((resolve, reject) => {
            const multi = client.multi();
            //const id = buildId();
            const id = chartId;
            const redisKey = this._buildRedisKey(id);
            const serialized = this.schema.serialize(data);

            // Handle the hash values
            if (this.schema.serType === 'stringify') {
                if (serialized) {
                    multi.set(redisKey, serialized);
                }
            } else if (this.schema.serType === 'array') {
                if (serialized) {
                    multi.rpush(redisKey, serialized);
                    //.multi.hmset(redisKey, 'EX', expSeconds());  // TODO
                } else {
                    reject(new Error('Empty redis array data'));
                }
            } else {  // assuming Object
                if (serialized) {
                    multi.hmset(redisKey, serialized);
                    multi.hmset(redisKey, 'EX', expSeconds());
                } else {
                    reject(new Error('Empty redis hash data'));
                }
            }

            // Handle indexes
            if (this.schema.hasOwnProperty('indexes')) {
                _.each(this.schema.indexes, indexConf => {
                    if (indexConf.shouldIndex(data)) {
                        multi.zadd(this._buildIndexName(`${id}_${indexConf.getName(data)}`), indexConf.getValue(data), redisKey);
                    }
                });
            }

            multi.exec((err, results) => {
                if (err) return reject(err);

                return resolve({ key: redisKey, _id: id, ...data });
            });
        });
    }

    update(id, data) {
        return new Promise((resolve, reject) => {
            const redisKey = this._buildRedisKey(id);

            // Handle the hash values
            const hashValues = this._buildObjectHashValues(data);
            if (hashValues) {
                client.hmset(redisKey, hashValues, (err) => {
                    if (err) return reject(err);

                    return resolve();
                });
            } else resolve();
        });
    }

    findOne(id) {
        return new Promise((resolve, reject) => {
            const redisKey = this._buildRedisKey(id);
            client.hgetall(redisKey, (err, data) => {
                if (err) return reject(err);

                return resolve({
                    key: redisKey,
                    _id: id,
                    ...this._unpackHashValues(data),
                });
            });
        });
    }

    fromIndex(indexName) {
        return this._getIndexedIds(indexName, undefined, 250)
            .then(results => Promise.all(results.map(result => this.findOne(result))));
    }
}
