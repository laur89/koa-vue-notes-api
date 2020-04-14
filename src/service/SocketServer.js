import logger from '../logs/log.js';
import http from 'http';
import { getRandInt, getRand } from '../utils/utils.js';
import { Chart } from '../models/Chart.js';
import { User } from '../models/User.js';
import zmq from 'zeromq';
import io from 'socket.io';
import Mock from './MockData.js';

//import ioClient from 'socket.io-client'
//import http from 'http';
//import SocketIO from 'socket.io';
import joi from 'joi';
import fs from 'fs';
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


class Sock {
    constructor(app) {
        const server = http.createServer(app); // form https://github.com/socketio/socket.io
        this.ioSock = io(server, {
            path: '/sock',
            serveClient: false,
            // below are engine.IO options
            pingInterval: 25 * 1000,
            //transports: ['websocket'],
            pingTimeout: 10 * 1000,
            cookie: 'sock-hndshk-sid',
        }); //.of('/sock');
        //this.ioSock = io.listen(server)

        // TODO consider namespaces: https://socket.io/docs/rooms-and-namespaces/
        //const nsp = this.ioSock.of('/sock');
        //nsp.on('connection', function(socket) {
        //    logger.info('  >>>>> a user connected on our namespace!');
        //})

        // Receiving connection to SocketIO:
        this.ioSock.on('connection', socket => {
            logger.info('  >>>>> a user connected!');
            socket.on('sub_chart', (algoId, lastDataTimestamp) => {
                logger.info(
                    `joining connection ${
                        socket.id
                    } to [${algoId}]; last data: ${lastDataTimestamp}`
                );
                // TODO: report err if algoId doesn't exist?
                socket.join(algoId);
            });
            socket.on('unsub_chart', algoId => {
                logger.info(`leaving connection ${socket.id} from [${algoId}]`);
                socket.leave(algoId);
            });

            //sendStaticPayload(this.ioSock);
        });

        server.listen(4001);
    }

    startPlayback() {
        const mock = new Mock();
        const i = () => {
            const next = mock.getNextSegment();
            if (next !== null) {
                this.ioSock.sockets.emit('CHARTITO', next);
                setTimeout(i, 1000);
            } else {
                logger.info('end of mock data');
            }
        };

        setTimeout(i, 5000);
        //id = setTimeout(() => setInterval(this.pushToClients.bind(null, mock), 1000), 10000);
    }

    getSocket() {
        return this.ioSock;
    }
}

// for testing/debugging
const sendStaticPayload = ioSock => {
    const timeRand = Math.floor(getRandInt(1000000, 9000000) * 60000);
    logger.error('sending static...');
    //fs.writeFile('/tmp/waaaat.dat', JSON.stringify(vueChart), 'utf8', () => {});
    fs.readFile('/tmp/processed-lean.dat', 'utf8', (err, data) => {
        ioSock.sockets.emit('CHARTITO22O', JSON.parse(data));
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
    //fs.writeFile('/tmp/out.dat', JSON.stringify(a), 'utf8', () => {});
};

export default Sock;
