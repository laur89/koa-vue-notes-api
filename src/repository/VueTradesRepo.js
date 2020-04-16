import BasicRepo from './BasicRepo.js';

const schema = {
    namespace: 'trades',
    indexes: [
        {
            getName: () => 'timestamp',
            shouldIndex: () => true, // TODO: this is dumb right - why else have index conf listed under indexes if we don't want to use it?
            addNonTenantIndex: () => true,
            getValue: data => data.payload[0],
        },
    ],
    serialize(data) {
        return JSON.stringify(data.payload);
    },
    write(multi, key, serializedData) {
        multi.set(key, serializedData);
    },
    deserialize(data) {
        return JSON.parse(data);
    },
    getId(data, id) {
        return `${id}:${data.id}`;  // mustn't be randomized!
    },
    //serialize_obj(client) {  // Object example; use 'flat' package we're dealing with nested object
    //return Object.entries(data).flat(1);
    // or maybe for (const key in data) {
    //}
};

export default new BasicRepo(schema);
