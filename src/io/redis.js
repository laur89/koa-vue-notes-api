
import shortid from 'shortid';
import _ from 'lodash';

const getRedisClient = () => {
    // IMPLEMENT YOUR OWN METHOD OF GETTING THE REDIS CLIENT,
};

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

export default class RedisModel {
    constructor(schema) {
        this.props = {
            schema,
            client: getRedisClient(),
        };
    }

    _buildHashValues(data) {
        const { schema: { attributes } } = this.props;
        const hashValues = [];

        _.each(data, (value, key) => {
            const type = (attributes[key] || {}).kind;
            const stringValue = stringify[type] ? stringify[type](value) : undefined;
            if (!type || !stringValue) return null;

            return hashValues.push(key, stringValue);
        });

        return _.isEmpty(hashValues) ? undefined : hashValues;
    }

    _buildRedisKey(id) {
        const { schema } = this.props;
        return `${schema.namespace}:${id}`;
    }

    _buildIndexName(indexName) {
        const { schema } = this.props;
        return `${schema.namespace}:${indexName}`;
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
        const { client, schema } = this.props;
        return new Promise((resolve, reject) => {
            const now = new Date().getTime();
            const secondsPerDay = 86400;
            const args = [
                this._buildIndexName(schema, indexName),
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
        const { client } = this.props;

        return this._clearOldIndexes(indexName)
            .then(() => new Promise((resolve, reject) => {
                const args = [indexName, '+inf', '-inf', 'LIMIT', offset || 0, limit || 20];

                client.zrevrangebyscore(args, (err, results) => {
                    if (err) return reject(err);

                    return resolve(results);
                });
            }));
    }

    create(data) {
        const { schema, client } = this.props;

        return new Promise((resolve, reject) => {
            const multi = client.multi();
            const id = buildId();
            const redisKey = this._buildRedisKey(id);

            // Handle the hash values
            const hashValues = this._buildHashValues(data);
            if (hashValues) {
                multi.hmset(redisKey, hashValues);
                multi.hmset(redisKey, 'EX', expSeconds());

                // Handle indexes
                if (schema.indexes) {
                    _.each(schema.indexes, (index) => {
                        if (index.shouldIndex(data)) {
                            multi.zadd(this._buildIndexName(index.getName(data)), index.getValue(data), redisKey);
                        }
                    });
                }

                multi.exec((err) => {
                    if (err) return reject(err);

                    return resolve({ key: redisKey, _id: id, ...data });
                });
            } else {
                reject(new Error('Empty redis hash data'));
            }
        });
    }

    update(id, data) {
        const { client } = this.props;

        return new Promise((resolve, reject) => {
            const redisKey = this._buildRedisKey(id);

            // Handle the hash values
            const hashValues = this._buildHashValues(data);
            if (hashValues) {
                client.hmset(redisKey, hashValues, (err) => {
                    if (err) return reject(err);

                    return resolve();
                });
            } else resolve();
        });
    }

    findOne(id) {
        const { client } = this.props;

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