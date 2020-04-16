import redis from '../io/redisClientProvider.js';
import VueTradesRepo from '../repository/VueTradesRepo.js';
import logger from '../logs/log.js';

const volatileRuntimeChartConfigs = new Map(); // only used in-memory while chart/algo is still live; not to be persisted;

const processOrder = leanOrder => ({
    id: leanOrder.Id,
    payload: [
        Date.parse(leanOrder.CreatedTime),  // or Time? or LastFillTime?
        leanOrder.Direction === 1 ? 0 : 1,  // confirm lean 1 means sell, 0 means buy; might be because acc curr = USD, and we're selling EURUSD, hence buying usd?
        leanOrder.Price,
        leanOrder.Value,
    ]
});

export default class ChartProcessor {
    constructor(ioSock) {
        this.ioSock = ioSock.getSocket();
    }


    async processLeanOrders(oResults, algoId) {
        const chartConfId = `${algoId}:onchart:orders`;   // trades
        let chartConf = volatileRuntimeChartConfigs.get(chartConfId);
        const chartMissing = chartConf === undefined;

        const orders = [];
        for (const orderKey in oResults.Orders) {
            const o = oResults.Orders[orderKey];
            orders.push(processOrder(o));
        }

        if (orders.length === 0) return;

        // sort, just in case:
        orders.sort((a, b) => a.payload[0] - b.payload[0]);

        //for (const oderEvent of oResults.OrderEvents) {
        //
        //}

        if (chartMissing) {
            chartConf = {
                name: 'Orders',
                type: 'Trades',
                settings: {
                    'z-index': 5,  // we want order markers to be drawn above candles & the rest;
                },
            }
        }

        this.ioSock.to(algoId).emit('data', {
            onchart: [{
                ...chartConf,
                data: orders.map(o => o.payload),
            }]
        });

        //logger.error(`about to store ${orders.length} orders!`);
        orders.forEach(d => VueTradesRepo.write(chartConfId, d));

        if (chartMissing) {  // also means it hasn't been persisted to chart configin redis
            await redis.get(algoId).then(result => {
                const cnf = {
                    readRepo: 'vueTrades', // so we know which repo implementation to read the data with
                    conf: chartConf,
                    id: chartConfId, // for accessing persisted candle data later on;
                };

                if (!result) {  // null if not found
                    result = {
                        running: true,
                        chart: null, // indicate main chart has not been initialized yet
                        onchart: [cnf],
                        offchart: [],
                    };
                } else {  // conf exists, update the relevant bit(s):
                    result = JSON.parse(result);
                    result.onchart.push(cnf);
                }

                return redis.set(algoId, JSON.stringify(result)); // TODO log out write errors!
            }).then(() => {
                volatileRuntimeChartConfigs.set(chartConfId, chartConf);
            });
        }
    }
}
