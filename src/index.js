'use strict';

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import logger from './logs/log.js';
import userAgent from 'koa-useragent';
import error from 'koa-json-error';
import ratelimit from 'koa-ratelimit';
import Consumer from './service/ZMQConsumer.js';
import Sock from './service/SocketServer.js';
import Processor from './service/LeanDataProcessor.js';
import redis from './io/redisClientProvider.js';

//Routes
import userActionsRouter from './routes/userActions.js';
import notesRouter from './routes/notes.js';
import chartsRouter from './routes/charts.js';

//Initialize app
const app = new Koa();

//app.listen(4000);  // _if_ we're starting listening from here not from app.js

// ioSocket & ZMQ:
const socket = new Sock(app.callback());
const processor = new Processor(socket);
new Consumer(socket, processor).start();
//socket.startPlayback();  // replay our mock data

// TODO: delete this after debugging:
//import QuoteBar from './model/QuoteBar.js';
//let qb = new QuoteBar('EURUSD', undefined, undefined, undefined, undefined, 666);
//logger.error(qb);

//Here's the rate limiter
app.use(
    ratelimit({
        db: redis,
        duration: 60000,
        errorMessage:
            "Hmm, you seem to be doing that a bit too much - wouldn't you say?",
        id: ctx => ctx.ip,
        headers: {
            remaining: 'Rate-Limit-Remaining',
            reset: 'Rate-Limit-Reset',
            total: 'Rate-Limit-Total',
        },
        max: 100,
    })
);

//Let's log each successful interaction. We'll also log each error - but not here,
//that's be done in the json error-handling middleware
app.use(async (ctx, next) => {
    try {
        await next();
        logger.info(
            ctx.method + ' ' + ctx.url + ' RESPONSE: ' + ctx.response.status
        );
    } catch (error) {}
});

//Apply error json handling
let errorOptions = {
    postFormat: (e, obj) => {
        //Here's where we'll stick our error logger.
        logger.info(obj);
        if (process.env.NODE_ENV !== 'production') {
            return obj;
        } else {
            delete obj.stack;
            delete obj.name;
            return obj;
        }
    },
};
app.use(error(errorOptions));

// return response time in X-Response-Time header
app.use(async function responseTime(ctx, next) {
    const t1 = Date.now();
    await next();
    const t2 = Date.now();
    ctx.set('X-Response-Time', Math.ceil(t2 - t1) + 'ms');
});

//For cors with options
app.use(cors({ origin: '*' }));

//For useragent detection
app.use(userAgent);

//For managing body. We're only allowing json.
app.use(bodyParser({ enableTypes: ['json'] }));

//For router
app.use(userActionsRouter.routes());
app.use(userActionsRouter.allowedMethods());
app.use(notesRouter.routes());
app.use(notesRouter.allowedMethods());
app.use(chartsRouter.routes());
app.use(chartsRouter.allowedMethods());

export default app;
