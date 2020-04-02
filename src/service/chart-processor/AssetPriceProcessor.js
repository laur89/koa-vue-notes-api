import {
    getCommonConsolidators,
    timeframeToPeriod,
} from '../LeanDataProcessorConf.js';
import TradeBar from '../../model/TradeBar.js';
import IDate from '../../utils/IDate.js';
import TradeBarConsolidator from '../../consolidators/TradeBarConsolidator.js';

//const priceRgx = /^(?<symbol>[A-Z]+)\[(?<ohlc>[OHLC]),(?<timeframe>[0-9]+[smhd])]$/;  // eg "EURUSD[H,1m]"
const priceRgx = /^(?<symbol>[A-Z]+)\[(?<ohlc>[OHLC]),(?<timeframe>\d*(tick|sec|min|hr|day))]$/; // eg "EURUSD[H,1min]"

const convertAssetPriceToCandles = (chart, chartConf) => {
    const series = chart.Series;
    let index = null;
    let symbol, timeframe, periodMs;

    if (chartConf === undefined) {
        //const j = series[Object.keys(series)[0]];
        const match = priceRgx.exec(Object.keys(series)[0]);
        if (match === null)
            throw new Error(
                `Unexpected Asset Price series name: [${
                    Object.keys(series)[0]
                }]`
            ); // sanity check
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

    if (
        !(
            o.length !== 0 &&
            o.length === h.length &&
            o.length === l.length &&
            o.length === c.length
        )
    ) {
        throw new Error(
            `${symbol} tradebar series lengths didn't match or were equal to 0`
        );
    }

    const bars = [];
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
        return [
            bars,
            {
                //
                conf: {
                    type: 'Candles',
                    name: 'TODO AP name',
                    chartName: 'Our chart name from api',
                    //data: [],
                    settings: {},
                    // TODO: we should also store series index somewhere
                },
                timeframe: {
                    symbol: timeframe,
                    periodMs: periodMs,
                },
                symbol: symbol,
                //isInRedis: false,   // marks if root element ('chart') for this algo has been stored in redis & is discoverable
                //bars: bars,
                consolidators: getCommonConsolidators(
                    periodMs,
                    TradeBarConsolidator,
                    () => {}
                ),
                consolidatorConstructor: TradeBarConsolidator,
            },
        ];
    }

    return [bars, chartConf];
};

export default convertAssetPriceToCandles;
