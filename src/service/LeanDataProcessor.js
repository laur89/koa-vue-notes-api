//import chartConverter from '../converters/vue/ChartConverter.js'
import TradeBar from "../model/TradeBar.js";
import BaseData from "../model/BaseData.js";
import IDate from "../utils/IDate.js";
import TradeBarConsolidator from "../consolidators/TradeBarConsolidator.js";
import BaseDataConsolidator from "../consolidators/BaseDataConsolidator.js";
import {tradeBarToVueCandleBar} from '../converters/vue/ChartConverter.js';
import logger from "../logs/log.js";
import {getMethodsNames} from '../utils/utils.js';
//import CandleModel from '../model/vue/Candle.js';
import VueCandleRepo from "../repository/VueCandleRepo.js";
import repoSelector from "../repository/repoSelector.js";
import redis from '../io/redisClientProvider.js';


const ignoredCharts = ['Alpha', 'Insight Count', 'Alpha Assets', 'Benchmark'];
const volatileRuntimeChartConfigs = new Map();  // only used in-memory while chart/algo is still live; not to be persisted;

const priceRgx = /^(?<symbol>[A-Z]+)\[(?<ohlc>[OHLC]),(?<timeframe>[0-9]+[smhd])]$/;  // eg "EURUSD[H,1m]"
const RSIRgx = /^RSI\((?<period>\d+),(?<movingAvgType>\w+),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)$/;  // eg "RSI(14,Wilders,EURUSD_hr)"
const timeframeRgx = /^(?<no>\d+)(?<val>[smhd])$/;  // eg "1m"

const timeframeConversion = {
    s: 1000,
    m: 60 * 1000,
    h: 3600 * 1000,
    d: 24 * 3600 * 1000
};

const timeframeToPeriod = tf => {
    const match = timeframeRgx.exec(tf);
    if (match === null) throw new Error(`Unexpected timeframe from LEAN: ${tf}`);  // sanity check
    return parseInt(match.groups.no) * timeframeConversion[match.groups.val];
};

const periodToTimeframe = periodMs => {
    const hours = periodMs / 3600000;
    const minutes = (periodMs % 3600000) / 60000;
    const seconds = (periodMs % 60000) / 1000;
    //const millis = periodMs % 1000;

    //return (periodMs / 60000) + 'm'; <- if we only want minutes
    return (hours !== 0 ? hours + 'h' : '') + (minutes !== 0 ? minutes + 'm' : '') + (seconds !== 0 ? seconds + 's' : '');
};

const toBaseData = (symbol, d) => {
    const bd = new BaseData();

    bd.Symbol = symbol;
    bd.Time = new IDate(d.x * 1000); // LEAN sends data in seconds
    bd.Value = d.y;

    return bd;
};

//const processAssetPrice = (c, chart) => {
const convertAssertPriceToTradeBars = (chart, chartConf) => {
    const series = chart.Series;
    let index = null;
    const bars = [];
    let symbol, timeframe, periodMs;

    if (chartConf === undefined) {
        //const j = series[Object.keys(series)[0]];
        const match = priceRgx.exec(Object.keys(series)[0]);
        if (match === null) throw new Error('Unexpected Asset Price series name');  // sanity check
        symbol = match.groups.symbol;
        //const ohlc = match.groups.ohlc;
        timeframe = match.groups.timeframe;
        periodMs = timeframeToPeriod(timeframe);
    } else {
        symbol = chartConf.symbol;
        timeframe = chartConf.timeframe.symbol;
        periodMs = chartConf.timeframe.periodMs;
    }

    const o = series[`${symbol}[O,${timeframe}]`].Values;
    const h = series[`${symbol}[H,${timeframe}]`].Values;
    const l = series[`${symbol}[L,${timeframe}]`].Values;
    const c = series[`${symbol}[C,${timeframe}]`].Values;

    if (!(o.length !== 0 && o.length === h.length && o.length === l.length && o.length === c.length)) {
        throw new Error(`${symbol} tradebar series lengths didn't match or were equal to 0`);
    }

    for (let i = 0; i < o.length; i++) {
        const bar = new TradeBar();
        bar.Symbol = symbol;
        bar.Period = periodMs;
        //bar.Time = new IDate(o[i].x); // do not convert to nanos here, as we're still on LEAN data at this point;
        bar.Time = new IDate(o[i].x * 1000); // LEAN sends data in seconds
        bar.Open = o[i].y;
        bar.High = h[i].y;
        bar.Low = l[i].y;
        bar.Close = c[i].y;
        bars.push(bar);
    }

    if (chartConf === undefined) {
        // TODO: should we also store the running bar tally in memory? at least until if/when we move to kafka
        return [bars, {
            //
            conf: {
                type: 'Candles',
                chartName: 'Our chart name from api',
                //data: [],
                settings: {}
                // TODO: we should also store series index somewhere
            },
            timeframe: {
                symbol: timeframe,
                periodMs: periodMs
            },
            symbol: symbol,
            //isInRedis: false,   // marks if root element ('chart') for this algo has been stored in redis & is discoverable
            //bars: bars,
            consolidators: getCommonConsolidators(periodMs, TradeBarConsolidator, () => {}),
            consolidatorConstructor: TradeBarConsolidator
        }];
    }

    return [bars, chartConf];
};


const equitySymbol = 'Equity';
const toEquityBaseData = toBaseData.bind(null, equitySymbol);
// TODO: daily performance is a separate case, can't really consolidate it much, can we
const processStratEquity = (c, chartConf) => {
    const series = c.Series;
    const s = series[equitySymbol];
    //const equityBaseData = s.Values.map(d => toBaseData(equitySymbol, d));
    const equityBaseData = s.Values.map(toEquityBaseData);

    if (chartConf === undefined) {
        if (s.Values.length < 2) {
            throw new Error('[Equity] series length < 2, cannot derive period');
        }

        const periodMs = s.Values[1].x - s.Values[0].x;
        const baseConsolidatorPeriodMs = periodMs * 60;  // TODO: is 60 a good multiplier for our base-consolidator?

        // TODO: where to push data of these semi-auto created consolidators?
        const onConsolidated = () => {

        };
        //const consolidators = getCommonConsolidators(periodMs, BaseDataConsolidator, onConsolidated);
        const consolidators = [];  // TODO: lacking common/base/pre-defined consolidators atm
        if (!consolidators.some(c => c.Period === baseConsolidatorPeriodMs)) {
            const c = new BaseDataConsolidator(baseConsolidatorPeriodMs);
            c.DataConsolidated.push((sender, data) => {
//                vueChart.chart.offchart[0].data.push(tradeBarToVueCandleBar(data));  TODO: uncomment this at one point
            });
            consolidators.push(c);
        }

        // TODO: should we also store the running bar tally in memory? at least until if/when we move to kafka
        return [equityBaseData, {
            timeframe: {
                symbol: periodToTimeframe(periodMs),
                periodMs: periodMs  // TODO: only do this for first msg, think we should store this in working memory?
            },
            symbol: equitySymbol,
            //bars: equityBars,
            consolidators: consolidators,
            consolidatorConstructor: BaseDataConsolidator
        }];
    } else {
        return [equityBaseData, chartConf];
    }
};

const processIndicators = (c, chart) => {

};

const getCommonConsolidators = (periodMs, consolidatorConstructor, onConsolidated) => (
    [3, 5, 30, 60]  // minutes
        .map(p => p * 60 * 1000)
        .filter(p => p > periodMs)
        .map(p => {
                const c = new consolidatorConstructor(p);
                c.DataConsolidated.push((sender, data) => {
                    onConsolidated(data);
                });
                return c;
            }
        )
);


export default class Processor {
    constructor(ioSock) {
        this.ioSock = ioSock.getSocket();
    }

    // TODO: is there even point in returning bars from per-chart processors/converters to this function?
    // guess some benefit might be in invoking consolidator.Update from a singular place;
    processLeanChart(c, algoId) {
        if (ignoredCharts.includes(c.Name)) return;

        let chartConf = volatileRuntimeChartConfigs.get(algoId + c.Name);
        let chartMissing = chartConf === undefined;
        const id = `${algoId}:chart:${c.Name}`;

        let data;  // tradebars or basedata
        switch (c.Name) {
            case 'Asset Price':
                [data, chartConf] = convertAssertPriceToTradeBars(c, chartConf);
                //vueChart.chart.chart.data.push(...data.map(tradeBarToVueCandleBar));

                const vueBars = data.map(tradeBarToVueCandleBar);
                this.ioSock.to(algoId).emit('chart', {
                    conf: chartConf.conf,
                    data: vueBars
                });

                // TODO: perhaps more efficient to check if key that stars w/ 'algoId:chart:' exists? that'd mean that chart,on-offChart are stored under separate keys tho...
                // then again, we'd only win on read, as we expect it all to be there...
                // TODO2: put this guy also into node-cache for even faster access?
                redis.get(algoId).then(result => {  // no need to block right?
                    //logger.error(algoId + " redis query result: " + result);
                    //logger.error(algoId + " redis query result type: " + typeof result);

                    if (!result) {
                        redis.set(algoId, JSON.stringify({
                            chart: {
                                readRepo: 'vueCandle',  // so we know which repo to read the data with
                                conf: chartConf.conf,
                                id  // for accessing persisted candle data;
                            },
                            onchart: [],
                            offchart: []
                        }));  // TODO log out write errors!
                        return;
                    }

                    result = JSON.parse(result);
                    if (result.chart === null) {
                        // TODO: prolly have to parse result first?
                        result.chart = {
                            readRepo: 'vueCandle',
                            conf: chartConf.conf,
                            id
                        };
                        redis.set(algoId, JSON.stringify(result));  // TODO log out write errors!
                    }
                });

                //redis.set(`${algoId}_chart_conf`, JSON.stringify(chartConf.conf));  // think all chart conf is ok to store under <algoId> key

                // store bars in redis:
                vueBars.forEach(bar =>
                    VueCandleRepo.write(id, bar)  // no need to block right?
                );


                // add consolidator:
                //const c = new TradeBarConsolidator(3600 * 1000);
                //c.DataConsolidated.push((sender, data) => {
                //    putDataTogetherAndPushToSocket()
                //});
                break;
            case 'Strategy Equity':
                [data, chartConf] = processStratEquity(c, chartConf);
                //getCommonConsolidators(periodMs, TradeBarConsolidator, () => {})
                //vueChart.chart.offchart[0].data.push(...bars);
                break;


                this.ioSock.to(algoId).emit('offchart', {
                    //id: `${chartIdTODO}:chart`,
                    id: ['chart'], // or ['onchart', 'our EMA']
                    conf: chartConf.conf,
                    data: vueBars
                });
            //case 'Indicators':
            //processIndicators(c, chartConf);
            //break;
            default:
                // TODO: should we actively blacklist charts (ignoredCharts), and log errors here if unknown is ocurred, or just drop non-white list ones?
                return;
        }

        chartConf.consolidators.forEach(consolidator => {
            data.forEach(consolidator.Update, consolidator);

            // TODO: Scan doesn't make much sense in backtest, does it?
            //consolidator.Scan(timeKeeper.GetLocalTimeKeeper(update.Target.ExchangeTimeZone).LocalTime);
        });

        // TODO: can't have common save right? unless we use repoResolver map?
        //data.forEach(bar => {
        //     VueCandleRepo.write(algoId, );
        //});

        if (chartMissing) {
            volatileRuntimeChartConfigs.set(algoId + c.Name, chartConf);
        }
    };
}

