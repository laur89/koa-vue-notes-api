// TODO: deleteme, superseded by repos
import RedisModel from '../../io/redis.js';
import data from '../../static-data/data';
import client from '../../io/redisClientProvider';
//import _ from 'lodash';

const schema = {
    namespace: 'candles',
    indexes: [
        {
            getName: () => 'timestamp',
            shouldIndex: () => true, // TODO: this is dumb right - why else have index conf listed under indexes if we don't want to use it?
            addNonTenantIndex: () => true,
            getValue: data => data[0],
        },
    ],
    serType: 'stringify',
    serialize(data) {
        return JSON.stringify(data);
    },
    read(key, client) {
        //const elements = client.lrange("supplier_id", 0, -1);

        client.get(key, (err, data) => {
            if (err) return reject(err);

            return resolve(JSON.parse(data));
        });
        //return JSON.parse(data);
    },
    //serialize_obj(client) {  // Object example; use 'flat' package we're dealing with nested object
        //return Object.entries(data).flat(1);
        // or maybe for (const key in data) {
    //}
};

export default new RedisModel(schema);
