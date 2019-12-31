import logger from '../logs/log.js';
import sTypeTrans from '../converters/vue/SeriestypeTranslator.js';
import toTradingVueType from '../converters/vue/LeanToVueSeriesTranslator.js';
//import chartConverter from '../converters/vue/ChartConverter.js'
import TradeBar from "../model/TradeBar.js";
import BaseData from "../model/BaseData.js";
import { SeriesType } from '../constants/Global.js';
import IDate from "../utils/IDate.js";
import TradeBarConsolidator from "../consolidators/TradeBarConsolidator.js";
import BaseDataConsolidator from "../consolidators/BaseDataConsolidator.js";


const ignoredCharts = ['Alpha', 'Insight Count', 'Alpha Assets', 'Benchmark'];
const msgTypes = new Map();
const eTypeToHasChartsCount = new Map();
const hasores = new Map();
const charts = new Map();

const priceRgx = /^(?<symbol>[A-Z]+)\[(?<ohlc>[OHLC]),(?<timeframe>[0-9]+[smhd])]$/;  // eg "EURUSD[H,1m]"
const RSIRgx = /^RSI\((?<period>\d+),(?<movingAvgType>\w+),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)$/;  // eg "RSI(14,Wilders,EURUSD_hr)"
const timeframeRgx = /^(?<no>\d+)(?<val>[smhd])$/;  // eg "1m"

const createChartScaffold = (mainChartType = ) => ({
    chartName: 'Our chart name from API',  // TODO: need to get the name dynamically
    chart: {
        chart: {
            type: mainChartType,
            data: [],
            settings: {}
        },
        onchart: [],
        offchart: []
    }
});

const timeframeConversion = {
    s: 1000,
    m: 60 * 1000,
    h: 3600 * 1000,
    d: 24 * 3600 * 1000
};

const timeframeToPeriod = tf => {
    const match = timeframeRgx.exec(tf);
    if (match === null) throw new Error(`Unexpected timeframe from LEAN: ${tf}`);  // sanity check
    return match.groups.no * timeframeConversion[match.groups.val];
};

const toBaseData = (symbol, d) => {
    const bd = new BaseData();

    bd.Symbol = symbol;
    bd.Time = new IDate(d.x);
    bd.Value = d.y;

    return bd;
};

//const processAssetPrice = (c, chart) => {
const convertAssertPriceToTradeBars = (c, chart) => {
    const series = c.Series;
    let index = null;
    let i = null;
    const bars = [];

    //const j = series[Object.keys(series)[0]];
    const match = priceRgx.exec(Object.keys(series)[0]);
    if (match === null) throw new Error('Unexpected Asset Price series name');  // sanity check
    const symbol = match.groups.symbol;
    //const ohlc = match.groups.ohlc;
    const timeframe = match.groups.timeframe;
    const periodMs = timeframeToPeriod(timeframe);
    const o = series[`${symbol}[O,${timeframe}]`];
    const h = series[`${symbol}[H,${timeframe}]`];
    const l = series[`${symbol}[L,${timeframe}]`];
    const close = series[`${symbol}[C,${timeframe}]`];

    for (let i = 0; i < o.Values.length; i++) {
        const bar = new TradeBar();
        bar.Symbol = symbol;
        bar.Period = periodMs;
        bar.Time = new IDate(o.Values[i].x); // do not convert to nanos here, as we're still on LEAN data at this point;
        bar.Open = o.Values[i].y;
        bar.High = h.Values[i].y;
        bar.Low = l.Values[i].y;
        bar.Close = close.Values[i].y;
        bars.push(bar);
    }

    return {
        timeframe: {
            symbol: timeframe,
            periodMs: periodMs
        },
        symbol: symbol,
        bars: bars,
        consolidators: [],
        consolidatorConstructor: TradeBarConsolidator
    };




    for (const seriesName of Object.keys(series)) {
        const s = series[seriesName];
        const leanSeriesType = sTypeTrans(s.SeriesType);
        if (leanSeriesType !== SeriesType.Candle) {}throw new Error('Asset Price segment should always have candle type)');  // sanity check

        const match = priceRgx.exec(s.Name);
        if (match === null) {}throw new Error(`Unexpected Asset Price series name ${s.Name}`);  // sanity check

        const symbol = match.groups.symbol;
        const ohlc = match.groups.ohlc;
        const timeframe = match.groups.timeframe;



        if (index === null) {}index = s.Index;
        if (i === null) {
            const match = priceRgx.exec(s.Name);
            if (match !== null) {
                match.groups.ohlc;
            }
        }

        logger.debug(
            `chart [${chartName}]:series [${
                s['Name']
            }] type: [${sTypeTrans(s['SeriesType'])}]`
        );
    }
};


// TODO: daily performance is a separate case, can't really consolidate it much, can we
const processStratEquity = (c, chart) => {
    const series = c.Series;

    const symbol = 'Equity';
    const s = series[symbol];
    const periodMs = s.Values[1].x - s.Values[0].x;  // TODO: only do this for first msg, think we should store this in working memory?
    const equityBars = s.Values.map(d => toBaseData(symbol, d));

    return {
        timeframe: {
            symbol: "?",
            periodMs: periodMs
        },
        symbol: symbol,
        bars: equityBars,
        consolidators: [],
        consolidatorConstructor: BaseDataConsolidator
    };
};

const processIndicators = (c, chart) => {

};

const getConsolidatorsFor = (data) => {
    if (data.consolidators.length === 0) {
        const periodMs = data.timeframe.periodMs;
        let periods;
        if (periodMs <= 60 * 1000) {
            periods = [
                3 * 60 * 1000,
                5 * 60 * 1000,
                30 * 60 * 1000,
                60 * 60 * 1000];
        } else if (periodMs <= 3 * 60 * 1000) {
            periods = [
                5 * 60 * 1000,
                30 * 60 * 1000,
                60 * 60 * 1000];
        } else if (periodMs <= 5 * 60 * 1000) {
            periods = [
                30 * 60 * 1000,
                60 * 60 * 1000];
        }

        periods.forEach(p => data.consolidators.push(new data.consolidatorConstructor(p)));
        data.consolidators.forEach(c => c.DataConsolidated.push((sender, data) => {
            putDataTogetherAndPushToSocket(data);
            })
        );

    return data.consolidators;
}

const process = c => {
    if (ignoredCharts.includes(c.Name)) return;

    let chart = charts.get('TODO hard-coded chart ID');
    if (chart === undefined) {
        chart = createChartScaffold();
    }

    let data;
    switch (c.Name) {
        case 'Asset Price':
            data = convertAssertPriceToTradeBars(c, chart);

            // add consolidator:
            //const c = new TradeBarConsolidator(3600 * 1000);
            //c.DataConsolidated.push((sender, data) => {
        //    putDataTogetherAndPushToSocket()
            //});

            assetPriceConsolidators.foreach(consolidator => {
                data.bars.forEach(bar => consolidator.Update(bar));

                // TODO: Scan doesn't make much sense in backtest, does it?
                //consolidator.Scan(timeKeeper.GetLocalTimeKeeper(update.Target.ExchangeTimeZone).LocalTime);
            });
            break;
        case 'Strategy Equity':
            data = processStratEquity(c, chart);
            getConsolidatorsFor(data).forEach(consolidator => {
                data.bars.forEach(consolidator.Update);

                // TODO: Scan doesn't make much sense in backtest, does it?
                //consolidator.Scan(timeKeeper.GetLocalTimeKeeper(update.Target.ExchangeTimeZone).LocalTime);
            });
            break;
        case 'Indicators':
            processIndicators(c, chart);
            break;
        default:
            // TODO: should we actively blacklist charts (ignoredCharts), and log errors here if unknown is ocurred, or just drop non-white list ones?
            return;
    }
};

export default process;
