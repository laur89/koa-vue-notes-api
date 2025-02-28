import BasicRepo from './BasicRepo.js';
import shortid from 'shortid';

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
    serialize(data) {
        return JSON.stringify(data);
    },
    write(multi, key, serializedData) {
        multi.set(key, serializedData);
    },
    deserialize(data) {
        return JSON.parse(data);
    },
    getId(data, id) {
        return `${id}:${shortid.generate()}`;
    },
    //serialize_obj(client) {  // Object example; use 'flat' package we're dealing with nested object
    //return Object.entries(data).flat(1);
    // or maybe for (const key in data) {
    //}
};

export default new BasicRepo(schema);
