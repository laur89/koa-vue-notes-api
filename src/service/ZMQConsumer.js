import logger from '../logs/log.js';
import sTypeTrans from '../converters/vue/SeriestypeTranslator.js';
//import chartConverter from '../converters/vue/ChartConverter.js'
import { getRandInt, getRand } from '../utils/utils.js';

import { Chart } from '../models/Chart.js';
import { User } from '../models/User.js';
import zmq from 'zeromq';
import fs from 'fs';
import ChartController from '../controllers/ChartController.js';

import val from './DataValidator.js';

import db from '../db/db.js';

import joi from 'joi';
import redis from '../io/redisClientProvider.js';
//import {SeriesType} from "../constants/Global";
//let io = ioClient('http://your-host')
//const io = ioClient(process.env.SOCK_PORT, {
//path: '/chartsock',
//serveClient: false,
//// below are engine.IO options
//pingInterval: 10000,
//pingTimeout: 5000,
//cookie: false
//});
//const io = ioClient({
//path: '/chartsock',
//serveClient: false,
//// below are engine.IO options
//pingInterval: 10000,
//pingTimeout: 5000,
//cookie: false
//})();
//let c = io.attach(process.env.SOCK_PORT)

//let cache = {}

const leanConf = {
    host: process.env.LEAN_HOST,
    port: process.env.LEAN_PORT,
};

const chartSchema = joi.object({
    id: joi.number().integer(),
    userId: joi
        .number()
        .integer()
        .required(),
    title: joi.string().required(),
    chartId: joi.string().required(),
});

//async store() {
//try {
//return await db('charts').insert(this)
//} catch (error) {
//console.log(error)
//throw new Error('ERROR')
//}
//}
//async create(ctx) {
//const request = ctx.request.body

////Attach logged in user (esp id) from db entry to our context:
//const user = new User(ctx.state.user)  // TODO get from LEAN payload

////Create a new chart object using params from received ZMQ payload
//const chart = new Chart(request)

////Validate the newly created chart
//const validator = joi.validate(chart, chartSchema)
//if (validator.error) throw validator.error.details[0].message;

//try {
//let result = await charts.store()
//ctx.body = { message: 'SUCCESS', id: result }
//} catch (error) {
//console.log(error)
//ctx.throw(400, 'INVALID_DATA')
//}
//}

// Create a function that will get triggered by ZeroMQ. Data is the binary stream that is recieved by ZeroMQ.
const pushToClients = (ioSock, data) => {
    // Parse the remaining string and send the object to your WebUi via SocketIO
    //data = JSON.parse(data)
    //logger.error(`>>> pushing via sock: ${JSON.stringify(data)}`);  // TODO delme
    ioSock.sockets.emit('CHARTITO', data);
    //process.exit(0);
    //ioSock.sockets.emit('kek', 14444)
};

const ignoredTypes = ['Debug'];
const msgTypes = new Map();
const eTypeToHasChartsCount = new Map();
const hasores = new Map();
const charts = new Map();
const vueCharts = new Map();
const algoIdsStoredInDB = new Set();

const createChartScaffold = (mainChartType = 'Candles') => ({
    // TODO: need to parametirze vue chart types
    chart: {
        chart: {
            type: mainChartType,
            data: [],
            settings: {},
        },
        //onchart: [],
        //offchart: [{
        //name: 'Equity',
        //type: 'Candles',
        //    data: []
        //}]
    },
});

const chartController = new ChartController(); // TODO: cc should be singleton
class Consumer {
    constructor(ioSock, processor) {
        this.ioSock = ioSock;
        this.processor = processor;
    }

    async start() {
        const sock = new zmq.Pull();

        sock.connect(`tcp://${leanConf.host}:${leanConf.port}`);
        logger.info(`ZMQ pull connected to ${leanConf.host}:${leanConf.port}`);

        const algoId = 'TODO hard-coded backtest ID72'; // TODO, extract from LEAN msg eventually

        let vueChart = vueCharts.get(algoId);
        if (vueChart === undefined) {
            vueChart = createChartScaffold();
            vueCharts.set(algoId, vueChart);
        }

        let i, t;
        for await (const [msg] of sock) {
            // Throw away the Topic of your received String by cutting off the first 4 bytes ('rand') (assuming 'rand' was our topic)
            //data = data.toString().slice(4)

            i = JSON.parse(msg);
            t = i['eType'];
            msgTypes.set(t, msgTypes.has(t) ? msgTypes.get(t) + 1 : 1);

            if (!algoIdsStoredInDB.has(algoId)) {
                await chartController.create({
                    // TODO: no point to await right? if not, then we'd just hope it gets stored
                    id: algoId,
                    type: 'backtest', // TODO, how to identify?
                    running: true,
                    startedAt: new Date(), // TODO: get time from LEAN
                    //endedAt: null
                });

                algoIdsStoredInDB.add(algoId);
            }

            if (ignoredTypes.includes(t)) {
                continue;
            } else if (i['dProgress'] === 1) {
                // we've reached end
                const d =
                    i.oResults.Charts['Asset Price']['Series']['EURUSD[O,1min]']
                        .Values;
                logger.error(`final monster-msg values size: ${d.length}`);
                logger.error(
                    `monster rannge: ${d[0].x} - ${d[d.length - 1].x}`
                );
                val.printRange(algoId);
            } else if (i.hasOwnProperty('oResults')) {
                hasores.set(t, hasores.has(t) ? hasores.get(t) + 1 : 1);

                if (!i.oResults.hasOwnProperty('Charts')) continue;
                eTypeToHasChartsCount.set(
                    t,
                    eTypeToHasChartsCount.has(t)
                        ? eTypeToHasChartsCount.get(t) + 1
                        : 1
                );

                let charts_ = i.oResults.Charts;
                for (const chartName in charts_) {
                    chartName &&
                        charts.set(
                            chartName,
                            charts.has(chartName)
                                ? charts.get(chartName) + 1
                                : 1
                        );
                    //logger.error(`chart ${chartName} seriestype: ${sTypeTrans(1)}`)
                    let c = charts_[chartName];
                    let series = c['Series'];
                    for (const seriesName in series) {
                        let s = series[seriesName];
                        logger.debug(
                            `chart [${chartName}]:series [${
                                s['Name']
                            }] type: [${sTypeTrans(s['SeriesType'])}]`
                        );
                    }

                    await this.processor.processLeanChart(c, algoId);
                }
            }

            //vueChart.chart.chart.data.length !== 0 && pushToClients(this.ioSock.getSocket(), vueChart);

            if (t === 'SystemDebug') {
                logger.error('FIN algo');
                persistFinalState(vueChart);

                logger.debug(msgTypes);
                msgTypes.clear();
                logger.debug(eTypeToHasChartsCount);
                eTypeToHasChartsCount.clear();
                logger.debug(hasores);
                hasores.clear();
                logger.debug(charts);
                charts.clear();

                algoIdsStoredInDB.delete(algoId);
                setAlgoFinished(algoId);

                val.reset(algoId);
            }
        }
    }
}

const setAlgoFinished = async algoId => {
    // redis:
    redis.get(algoId).then(result => {  // no need to block right?
        //logger.error(algoId + " redis query result: " + result);
        //logger.error(algoId + " redis query result type: " + typeof result);

        if (!result) {
            // TODO throw?
        }

        result = JSON.parse(result);
        // TODO: prolly have to parse result first?
        result.running = false;
        redis.set(algoId, JSON.stringify(result)); // TODO log out write errors!
    });

    // db:
    const chart = new Chart();
    await chart.find(algoId);
    chart.running = false;
    chart.endedAt = new Date(); // TODO: get algo endDate from LEAN response

    try {
        await chart.save();
    } catch (error) {
        console.log(error);
    }
};

const persistFinalState = state => {
    const timeRand = Math.floor(getRandInt(1000000, 9000000) * 60000);
    fs.writeFile(
        '/tmp/processed-lean.dat',
        JSON.stringify(state),
        'utf8',
        () => {}
    );
    return;

    fs.readFile('/tmp/out.json', 'utf8', (err, data) => {
        ioSock.sockets.emit('CHARTITO', JSON.parse(data));
        return;

        const a = JSON.parse(data);
        //logger.error('yo:1' + JSON.stringify(a));
        a.chart.chart.data = a.chart.chart.data.map(d => [
            d[0] + timeRand,
            //d[0],
            d[1] - getRand(-0.00009, 0.0001),
            d[2] - getRand(-0.00009, 0.0001),
            d[3] - getRand(-0.00009, 0.0001),
            d[4] - getRand(-0.00009, 0.0001),
            0,
        ]);

        fs.writeFile('/tmp/bugreport.dat', JSON.stringify(a), 'utf8', () => {});

        ioSock.sockets.emit('CHARTITO', a);
    });
};

export default Consumer;
