import joi from 'joi';
//import d from 'date-fns'

import { User } from '../models/User.js';
import { Chart } from '../models/Chart.js';
import {Note} from "../models/Note.js";
import repoSelector from "../repository/repoSelector.js";
import db from '../db/db.js';
import redis from '../io/redisClientProvider.js';
import d from "date-fns";
import aqp from 'api-query-params';

import NodeCache from 'node-cache';
import logger from "../logs/log.js";
const chartConfCache = new NodeCache( { // note it's fronting redis
    stdTTL: 5,  // in sec
    useClones: false,
    //checkperiod: 120
} );

// TODO: move schema and validation calls to Chart? otherwise it's possible to bypass it
const chartSchema = joi.object({
    id: joi.string().trim().required(),
    type: joi.string().trim().required(),
    running: joi.boolean().required(),
    startedAt: joi.date().timestamp().required(),
    endedAt: joi.date().timestamp().allow(null),
});

class ChartController {
    // this guy lists all charts, paginated
    async index(ctx) {
        const query = ctx.query;

        //Attach logged in user
        //const user = new User(ctx.state.user);
        //query.userId = user.id;

        //Init a new chart object
        const chart = new Chart();

        //Let's check that the sort options were set. Sort can be empty
        if (!query.order || !query.page || !query.limit) {
            ctx.throw(400, 'INVALID_ROUTE_OPTIONS');
        }

        //Get paginated list of charts
        try {
            let result = await chart.all(query);
            ctx.body = result;
        } catch (error) {
            console.log(error);
            ctx.throw(400, 'INVALID_DATA' + error);
        }
    }

    async fetchSlice(ctx) {
        const params = ctx.params;
        const { anchorTime, numberOfDataPoints, direction } = aqp(ctx.query).filter;

        if (!params.id) ctx.throw(400, 'INVALID_DATA');
        if (Math.abs(direction) !== 1) ctx.throw(400, 'direction can be 1 or -1');

        try {
            const conf = await this.getAlgoChartConf(params.id);
            //const rootChartRepo = repoSelector[conf.chart.readRepo];
            //const lastDataPoint = await repo.getLast(params.id);
            //const lastTimestamp = await rootChartRepo.getLastElement(params.id)[0];

            // TODO: need to indicate if our end is already at the end, and we should subscribe! sub from FE or BE side?

            // note promise order here is important:
            const chartRepo = repoSelector[conf.chart.readRepo];
            const results = await Promise.all(
                [].concat(
                    chartRepo.getFirstElementScore(conf.chart.id),
                    chartRepo.getLastElementScore(conf.chart.id),
                    chartRepo.getDataPoints(conf.chart.id, anchorTime, numberOfDataPoints, direction),
                    conf.onchart.map(onchart =>
                        repoSelector[onchart.readRepo].getDataPoints(onchart.id, anchorTime, numberOfDataPoints, direction),
                    ),
                    conf.offchart.map(offchart =>
                        repoSelector[offchart.readRepo].getDataPoints(offchart.id, anchorTime, numberOfDataPoints, direction),
                    )
                )
            );

            const firstElementTime = results.shift();
            const lastElementTime = results.shift();
            const mainChart = results.shift();

            if (mainChart.length === 0) {
                ctx.body = []
            } else {

                const markers = [];

                if (mainChart[0][0] === firstElementTime) markers.push('isBeginning');
                if (mainChart[mainChart.length - 1][0] === lastElementTime) {
                    if (!conf.running) {
                        markers.push('isEnd');
                    } else {
                        markers.push('isHead');
                    }
                }

                ctx.body = {
                    meta: {
                        markers
                    },
                    chart: {
                        ...conf.chart.conf,
                        data: mainChart,
                    },
                    onchart: conf.onchart.map(onchart => ({
                        ...onchart.conf,
                        data: results.shift(),
                    })),
                    offchart: conf.offchart.map(offchart => ({
                        ...offchart.conf,
                        data: results.shift(),
                    })),
                };
            }
        } catch (error) {
            console.log(error);
            ctx.throw(400, 'INVALID_DATA');  // TODO: return 500 instead?
        }
    }

    async fetchTail(ctx) {
        const params = ctx.params;
        const { span } = aqp(ctx.query).filter;

        if (!params.id) ctx.throw(400, 'INVALID_DATA');

        try {
            const conf = await this.getAlgoChartConf(params.id);
            const chartRepo = repoSelector[conf.chart.readRepo];
            const results = await Promise.all(
                [].concat(
                    chartRepo.getFirstElementScore(conf.chart.id),
                    chartRepo.getTail(conf.chart.id, span),
                    conf.onchart.map(onchart =>
                        //repoSelector[onchart.readRepo].getBetween(onchart.id, lastTimestamp - span, lastTimestamp)
                        repoSelector[onchart.readRepo].getTail(onchart.id, span)
                    ),
                    conf.offchart.map(offchart =>
                        //repoSelector[offchart.readRepo].getBetween(offchart.id, lastTimestamp - span, lastTimestamp)
                        repoSelector[offchart.readRepo].getTail(offchart.id, span)
                    )
                )
            );

            //logger.error(`RESULTS: ${JSON.stringify(results)}, typeof: ${typeof results}`);

            const firstElementTime = results.shift();
            const mainChart = results.shift();

            if (mainChart.length === 0) {
                ctx.body = []
            } else {

                const markers = ['isTail'];
                if (mainChart[0][0] === firstElementTime) markers.push('isBeginning');
                if (conf.running) {
                    markers.push('isHead');
                } else {
                    markers.push('isEnd');
                }

                ctx.body = {
                    meta: {
                        markers
                    },
                    chart: {
                        ...conf.chart.conf,
                        data: mainChart,
                    },
                    onchart: conf.onchart.map(onchart => ({
                        ...onchart.conf,
                        data: results.shift(),
                    })),
                    offchart: conf.offchart.map(offchart => ({
                        ...offchart.conf,
                        data: results.shift(),
                    })),
                };
            }
        } catch (error) {
            console.log(error);
            ctx.throw(400, 'INVALID_DATA');  // TODO: return 500 instead?
        }
    }

    async getAlgoChartConf(id) {
        //if (!id) ctx.throw(400, 'INVALID_DATA');
        let conf = chartConfCache.get(id);
        if (conf === undefined) {
            conf = await redis.get(id);  // TODO: move to repo? create configRepo for this whole function, including chartConfCache? at least move key to its own namespace
            if (!conf) throw new Error(`no chart conf found in redis for [${id}]`);
            logger.error(`got chartconf from redis: ${conf}`);
            conf = JSON.parse(conf);
            chartConfCache.set(id, conf);
        }

        logger.error(`chartconf: ${conf}`);
        if (conf.chart === null) throw new Error(`[chart] in chartConf not initialized yet`);
        return conf;
    }

    async create(chartData) {
        //Attach logged in user  ( TODO: get user from metadata sent over ZMQ?)
        //const user = new User(ctx.state.user);
        //request.userId = user.id;

        //Create a new note object using the request params
        const chart = new Chart(chartData);

        //Validate the newly created note
        const validator = joi.validate(chart, chartSchema);
        if (validator.error) throw new Error(validator.error.details[0].message);

        try {
            let result = await chart.store();
            //ctx.body = { message: 'SUCCESS', id: result };
        } catch (error) {
            console.log(error);
            //ctx.throw(400, 'INVALID_DATA');  // TODO: throw regular err?
        }
    }

    async update(id) {

        //Find and set that note
        const chart = new Chart();
        await chart.find(id);
        if (!chart) ctx.throw(400, 'INVALID_DATA');

        //Add the updated date value
        chart.updatedAt = d.format(new Date(), 'yyyy-MM-dd HH:mm:ss');

        //Add the ip
        request.ipAddress = ctx.ip;

        //Replace the note data with the new updated note data
        Object.keys(ctx.request.body).forEach(function(parameter, index) {
            chart[parameter] = request[parameter];
        });

        try {
            await chart.save();
            ctx.body = { message: 'SUCCESS' };
        } catch (error) {
            console.log(error);
            ctx.throw(400, 'INVALID_DATA');
        }
    }

    //async delete(ctx) {
    //const params = ctx.params
    //if (!params.id) ctx.throw(400, 'INVALID_DATA')

    ////Find that note
    //const note = new Chart()
    //await note.find(params.id)
    //if (!note) ctx.throw(400, 'INVALID_DATA')

    ////Grab the user //If it's not their note - error out
    //const user = new User(ctx.state.user)
    //if (note.userId !== user.id) ctx.throw(400, 'INVALID_DATA')

    //try {
    //await note.destroy()
    //ctx.body = { message: 'SUCCESS' }
    //} catch (error) {
    //console.log(error)
    //ctx.throw(400, 'INVALID_DATA')
    //}
    //}
}

export default ChartController;
