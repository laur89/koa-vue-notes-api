//I only want migrations, rollbacks, and seeds to run when the NODE_ENV is specified
//in the knex seed/migrate command. Knex will error out if it is not specified.
if (!process.env.NODE_ENV) {
    throw new Error('NODE_ENV not set');
}

//We don't want seeds to run in production
if (process.env.NODE_ENV === 'production') {
    throw new Error("Can't run seeds in production");
}

const faker = require('faker');

// for faker dates, see https://github.com/Marak/faker.js/wiki/Dates
exports.seed = async function(knex, Promise) {
    //Make 100 charts
    const seedData = [];
    for (let i = 0; i < 100; i++) {
        const testFakeChart = {
            id: faker.random.alphaNumeric(15),
            type: faker.random.arrayElement(['backtest', 'live']),
            running: faker.random.boolean(),
            //            startedAt: faker.random.number({min:1484873752000, max:1579481741000}),
            startedAt: faker.date.past(1),
            //endedAt: faker.random.number({min:1484873752000, max:1579481741000}),
            //endedAt: null,
            endedAt: faker.date.future(1),
        };
        seedData.push(testFakeChart);
    }

    // Deletes ALL existing entries:
    await knex('charts').truncate();

    // Insert:
    await knex('charts').insert(seedData);
};
