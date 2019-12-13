import logger from '../logs/log.js'
import http from 'http';

import { Chart } from '../models/Chart.js'
import { User } from '../models/User.js'
import zmq from 'zeromq'
import io from 'socket.io'
import Mock from './MockData.js'

//import ioClient from 'socket.io-client'
//import http from 'http';
//import SocketIO from 'socket.io';
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




//const ioSock = io(process.env.SOCK_PORT)
//console.log('yyyy sockets.emit:' + JSON.stringify(typeof ioSock.sockets.emit))
//console.log('yyyy:' + JSON.stringify(typeof ioSock.on))
//console.log('xx:' + JSON.stringify(typeof io.emit))

const leanConf = {
    host: process.env.LEAN_HOST,
    port: process.env.LEAN_PORT,
};

class Sock {
    constructor(app) {
        const server = http.createServer(app);  // form https://github.com/socketio/socket.io
        this.ioSock = io(server, {
            path: '/sock',
            serveClient: false,
            // below are engine.IO options
            pingInterval: 10000,
            //transports: ['websocket'],
            pingTimeout: 5000,
            cookie: 'sock-hndshk-sid'
        }) //.of('/sock');
        //this.ioSock = io.listen(server)

        // TODO consider namespaces: https://socket.io/docs/rooms-and-namespaces/
        //const nsp = this.ioSock.of('/sock');
        //nsp.on('connection', function(socket) {
        //    logger.info('  >>>>> a user connected on our namespace!');
        //})

        // Receiving connection to SocketIO:
        this.ioSock.on('connection', socket => {
            logger.info('  >>>>> a user connected!');
            //i = this.ioSock;
            //i.sockets.emit('CHARTITO', payload);
        });

        server.listen(4001)
    }

    startPlayback() {
        const mock = new Mock();
        const i = () => {
            const next = mock.getNextSegment();
            if (next !== null) {
                this.ioSock.sockets.emit('CHARTITO', next);
                setTimeout(i, 1000);
            } else {
                logger.info("end of mock data");
            }
        };

        setTimeout(i, 5000);
        //id = setTimeout(() => setInterval(this.pushToClients.bind(null, mock), 1000), 10000);
    }

    getSocket() {
        return this.ioSock;
    }
}

// Get the Object's methods names:
const getMethodsNames = function (obj = this) {
    return Object.keys(obj)
        .filter((key) => typeof obj[key] === 'function');
};

export default Sock