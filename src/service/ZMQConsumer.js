import logger from '../logs/log.js'
import sTypeTrans from '../converters/vue/SeriestypeTranslator.js'
//import chartConverter from '../converters/vue/ChartConverter.js'

import { Chart } from '../models/Chart.js'
import { User } from '../models/User.js'
import zmq from 'zeromq'

import joi from 'joi'
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
    //logger.error(`>>> zmq data received: ${data}`);  // TODO delme
    ioSock.sockets.emit('CHARTITO', data)
    //ioSock.sockets.emit('kek', 14444)
}

const ignoredTypes = ['Debug'];
const msgTypes = new Map();
const eTypeToHasChartsCount = new Map();
const hasores = new Map();
const charts = new Map();

class Consumer {
    constructor(ioSock) {
        this.ioSock = ioSock;
    }

    async start() {
        const sock = new zmq.Pull();

        sock.connect(`tcp://${leanConf.host}:${leanConf.port}`);
        logger.info(`ZMQ pull connected to ${leanConf.host}:${leanConf.port}`);

        let i, t;
        for await (const [msg] of sock) {
            // Throw away the Topic of your received String by cutting off the first 4 bytes ('rand') (assuming 'rand' was our topic)
            //data = data.toString().slice(4)

            i = JSON.parse(msg);
            t = i['eType'];
            msgTypes.set(t, msgTypes.has(t) ? msgTypes.get(t) + 1 : 1);

            if (ignoredTypes.includes(t)) {
                continue;
            } else if (i.hasOwnProperty('oResults')) {
                hasores.set(t, hasores.has(t) ? hasores.get(t) + 1 : 1);

                if (!i['oResults'].hasOwnProperty('Charts')) continue;
                eTypeToHasChartsCount.set(t, eTypeToHasChartsCount.has(t) ? eTypeToHasChartsCount.get(t) + 1 : 1);

                let charts_ = i['oResults']['Charts'];
                for (const chartName in charts_) {
                    chartName && charts.set(chartName, charts.has(chartName) ? charts.get(chartName) + 1 : 1);
                    //logger.error(`chart ${chartName} seriestype: ${sTypeTrans(1)}`)
                    let c = charts_[chartName];
                    let series = c['Series'];
                    for (const seriesName in series) {
                        let s = series[seriesName];
                        logger.debug(`chart [${chartName}]:series [${s['Name']}] type: [${sTypeTrans(s['SeriesType'])}]`)
                    }
                }
            }

            pushToClients(this.ioSock.getSocket(), i);

            if (t === 'SystemDebug') {
                logger.error('FIN algo');

                logger.debug(msgTypes);
                msgTypes.clear();
                logger.debug(eTypeToHasChartsCount);
                eTypeToHasChartsCount.clear();
                logger.debug(hasores);
                hasores.clear();
                logger.debug(charts);
                charts.clear();
            }
        }
    }
}

// Get the Object's methods names:
const getMethodsNames = function (obj = this) {
    return Object.keys(obj)
        .filter((key) => typeof obj[key] === 'function');
};

export default Consumer
