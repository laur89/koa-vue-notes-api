import logger from '../logs/log.js'

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

class Consumer {
    constructor(ioSock) {
        this.ioSock = ioSock;
    }

    async start() {
      const sock = new zmq.Pull

      sock.connect(`tcp://${leanConf.host}:${leanConf.port}`)
      logger.info(`ZMQ pull connected to ${leanConf.host}:${leanConf.port}`);

      let i
      for await (const [msg] of sock) {
          // Throw away the Topic of your received String by cutting off the first 4 bytes ('rand') (assuming 'rand' was our topic)
          //data = data.toString().slice(4)

        i = JSON.parse(msg)
        //console.log("work: %s", msg.toString())
        //logger.error('type: ' + typeof(msg))

        if (ignoredTypes.indexOf(i['eType']) !== -1) continue
        //logger.error(`  >>>> work!! (from lean): ${i}`);
		logger.error('<<work>>: ' + JSON.stringify(i))
        pushToClients(this.ioSock.getSocket(), i)
      }
    }
}

// Get the Object's methods names:
const getMethodsNames = function (obj = this) {
    return Object.keys(obj)
        .filter((key) => typeof obj[key] === 'function');
};

export default Consumer
