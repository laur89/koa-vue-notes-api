//import chartConverter from '../converters/vue/ChartConverter.js'
import TradeBar from '../model/TradeBar.js';
import BaseData from '../model/BaseData.js';
import IDate from '../utils/IDate.js';
import TradeBarConsolidator from '../consolidators/TradeBarConsolidator.js';
import BaseDataConsolidator from '../consolidators/BaseDataConsolidator.js';
import {
    tradeBarToVueCandleBar,
    baseDataToVueDataPoint,
} from '../converters/vue/ChartConverter.js';
import sTypeTrans from '../converters/vue/SeriestypeTranslator.js';
import logger from '../logs/log.js';
import { getMethodsNames } from '../utils/utils.js';
//import CandleModel from '../model/vue/Candle.js';
import VueCandleRepo from '../repository/VueCandleRepo.js';
import repoSelector from '../repository/repoSelector.js';
import redis from '../io/redisClientProvider.js';
import val from './DataValidator.js';

const ignoredCharts = ['Alpha', 'Insight Count', 'Alpha Assets', 'Benchmark'];

//const priceRgx = /^(?<symbol>[A-Z]+)\[(?<ohlc>[OHLC]),(?<timeframe>[0-9]+[smhd])]$/;  // eg "EURUSD[H,1m]"
const priceRgx = /^(?<symbol>[A-Z]+)\[(?<ohlc>[OHLC]),(?<timeframe>\d*(tick|sec|min|hr|day))]$/; // eg "EURUSD[H,1min]"
const RSIRgx = /^RSI\((?<period>\d+),(?<movingAvgType>\w+),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)$/; // eg "RSI(14,Wilders,EURUSD_hr)"
const BBRgx = /^BB\((?<period>\d+),(?<noStdDeviations>\d+(\.\d+)?),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)_(?<band>\w+)$/; // eg "BB(20,2.2,EURUSD_day)_MiddleBand"

// time postfix comes from QCAlgorithm.Indicators.cs
//const timeframeRgx = /^(?<no>\d+)(?<val>[smhd])$/;  // eg "1m"
const timeframeRgx = /^(?<no>\d*)(?<val>(tick|sec|min|hr|day))$/; // eg "1m"

const timeframeConversion = {
    //s: 1000,
    //m: 60 * 1000,
    //h: 3600 * 1000,
    //d: 24 * 3600 * 1000
    sec: 1000,
    min: 60 * 1000,
    hr: 3600 * 1000,
    day: 24 * 3600 * 1000,
    // TODO: what to do with tick?
};

const timeframeToPeriod = tf => {
    const match = timeframeRgx.exec(tf);
    if (match === null)
        throw new Error(`Unexpected timeframe from LEAN: ${tf}`); // sanity check
    //logger.error(`tf ${tf} .no value: [${match.groups.no}]`);

    const n = match.groups.no || 1;
    return parseInt(n) * timeframeConversion[match.groups.val];
};

// TODO: need to change postfixes to sec,min,hr...
const periodToTimeframe = periodMs => {
    const hours = periodMs / 3600000;
    const minutes = (periodMs % 3600000) / 60000;
    const seconds = (periodMs % 60000) / 1000;
    //const millis = periodMs % 1000;

    //return (periodMs / 60000) + 'm'; <- if we only want minutes
    return (
        (hours !== 0 ? hours + 'h' : '') +
        (minutes !== 0 ? minutes + 'm' : '') +
        (seconds !== 0 ? seconds + 's' : '')
    );
};

const toBaseData = (symbol, periodMs, d) => {
    const bd = new BaseData();

    bd.Symbol = symbol;
    bd.Time = new IDate(d.x * 1000); // LEAN sends data in seconds
    bd.Period = periodMs;
    bd.Value = d.y;

    return bd;
};

const seriesToBaseData = (symbol, periodMs, series) =>
    series.Values.map(dp => toBaseData(symbol, periodMs, dp));

const getCommonConsolidators = (
    periodMs,
    consolidatorConstructor,
    onConsolidated
) =>
    [3, 5, 30, 60] // minutes
        .map(p => p * 60 * 1000)
        .filter(p => p > periodMs)
        .map(p => {
            const c = new consolidatorConstructor(p);
            c.DataConsolidated.push((sender, data) => onConsolidated(data));
            return c;
        });

export {
    getCommonConsolidators,
    toBaseData,
    periodToTimeframe,
    timeframeToPeriod,
    seriesToBaseData,
    timeframeRgx,
    ignoredCharts,
};
