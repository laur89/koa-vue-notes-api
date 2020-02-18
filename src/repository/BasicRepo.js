
import shortid from 'shortid';
import _ from 'lodash';
import client from '../io/redisClientProvider.js';
import logger from "../logs/log.js";

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
export default class Repository {
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
                this._buildIndexName(indexName),
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

    // TODO: not much point in creating our explicit Promise here, is it?:
    _getIndexedIdsBetween(index, min, max) {
        //logger.info(`-> _getIndexedIdsBetween: ${JSON.stringify(arguments)}`);
        return new Promise((resolve, reject) => {
            client.zrangebyscore(index, min, max, (err, result) => {
                if (err) return reject(err);

                //logger.info(`INDXD IDS: ${result}, ${result.length}`);
                return resolve(result);
            });
        });
    }

    write(id, data) {
        return new Promise((resolve, reject) => {
            const multi = client.multi();
            //const id = id; // = buildId();
            //const redisKey = this._buildRedisKey(id);
            const dataKey = `${id}:${shortid.generate()}`;
            const serialized = this.schema.serialize(data);

            if (serialized) {
                this.schema.write(multi, dataKey, serialized);
                //.multi.hmset(redisKey, 'EX', expSeconds());  // TODO
            } else {
                reject(new Error('Empty redis array data'));
            }

            // Handle indexes
            if (this.schema.hasOwnProperty('indexes')) {
                this.schema.indexes.forEach(indexConf => {
                    if (indexConf.shouldIndex(data)) {
                        multi.zadd(this._buildIndexName(`${id}:${indexConf.getName(data)}`), indexConf.getValue(data), dataKey);
                    }
                });
            }

            multi.exec((err, results) => {
                if (err) return reject(err);

                //return resolve({ key: redisKey, _id: id, ...data });
                return resolve('OK');
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
            client.get(id, (err, data) => {
                if (err) return reject(err);

                //logger.info(`FIND_ONE: ${data}, ${typeof data}`);
                return resolve(this.schema.deserialize(data));
            });
        });
    }

    // TODO: this function was likely copypasta, remove
    fromIndex(indexName) {
        return this._getIndexedIds(indexName, undefined, 250)
            .then(results => Promise.all(results.map(this.findOne, this)));  // TODO need to provide this context to map()?
    }

    getLastElement(id, indexName = 'timestamp') {
        return new Promise((resolve, reject) => {
            client.zrevrangebyscore([this._buildIndexName(`${id}:${indexName}`), '+inf', '-inf', 'LIMIT', 0, 1], (err, results) => {
                if (err) return reject(err);
                if (results.length !== 1) return reject(new Error(`couldn't find last item for ${id}`));

                return resolve(results[0]);
            }).then(lastElementId => this.findOne(lastElementId));
        });
    }

    getLastElementScore(id, indexName = 'timestamp') {
        return new Promise((resolve, reject) => {
            client.zrevrangebyscore([this._buildIndexName(`${id}:${indexName}`), '+inf', '-inf', 'WITHSCORES', 'LIMIT', 0, 1], (err, results) => {
                if (err) return reject(err);
                if (results.length !== 2) return reject(new Error(`couldn't find last item score for [${id}]`));

//                logger.info(`LAST EL SCORE: ${results[1]}, ${typeof results[1]}`);
                return resolve(parseInt(results[1]));
            });
        });
    }

    getFirstElementScore(id, indexName = 'timestamp') {
        return new Promise((resolve, reject) => {
            client.zrangebyscore([this._buildIndexName(`${id}:${indexName}`), '-inf', '+inf', 'WITHSCORES', 'LIMIT', 0, 1], (err, results) => {
                if (err) return reject(err);
                if (results.length !== 2) return reject(new Error(`couldn't find first item score for [${id}]`));

//                logger.info(`FIRST EL SCORE: ${results[1]}, ${typeof results[1]}`);
                return resolve(parseInt(results[1]));
            });
        });
    }

    getTail(id, span, indexName = 'timestamp') {
        //this.getLastElement(algoId, indexName).then(lastElement => {
        //    const max = lastElement[0];
        //    return this.getBetween(algoId, max - span, max, indexName);
        //});
        return this.getLastElementScore(id, indexName).then(lastElementScore =>
            this.getBetween(id, lastElementScore - span, lastElementScore, indexName)
        );
    }

    getBetween(id, min, max, indexName = 'timestamp') {
        //logger.info(`-> getBetween: ${results[1]}, ${typeof results[1]}`);
//        logger.info(`-> getBetween: ${JSON.stringify(arguments)}`);
        return this._getIndexedIdsBetween(this._buildIndexName(`${id}:${indexName}`), min, max)
            .then(results => Promise.all(results.map(this.findOne, this)));  // TODO need to provide this context to map()?
    }
}
