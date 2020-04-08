import BaseDataConsolidator from '../../consolidators/BaseDataConsolidator.js';

import {
    getCommonConsolidators,
    seriesToBaseData,
    timeframeToPeriod,
} from '../LeanDataProcessorConf.js';

const RSIRgx = /^RSI\((?<period>\d+),(?<movingAvgType>\w+),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)$/; // eg "RSI(14,Wilders,EURUSD_hr)"
const ATRRgx = /^ATR\((?<period>\d+),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)$/; // eg "ATR(14,EURUSD_min)"

const getRgx = name => {
    if (name.startsWith('RSI')) {
        return RSIRgx;
    } else if (name.startsWith('ATR')) {
        return ATRRgx;
    } else {
        throw new Error(
            `Unexpected LineIndicators series name: [${name}]`);
    }
};

const getDefaultSettings = name => {
    if (name.startsWith('RSI')) {
        return {
            upper: 70,
            lower: 30,
            backColor: '#9b9ba316',
            bandColor: '#666',
        };
    }

    return {};
};

const getType = name => {
    if (name.startsWith('RSI')) return 'Range';

    return 'Spline';
};

const convertSingleLineIndicatorToSpline = (series, chartConf) => {
    let symbol, timeframe, periodMs, name;

    if (chartConf === undefined) {
        const match = getRgx(series.Name).exec(series.Name);
        if (match === null)
            throw new Error(
                `Unexpected LineIndicators series name: [${series.Name}]`
            ); // sanity check
        name = match.input;
        symbol = match.groups.symbol;
        timeframe = match.groups.timeframe;
        periodMs = timeframeToPeriod(timeframe);
    } else {
        symbol = chartConf.symbol;
        timeframe = chartConf.timeframe.symbol;
        periodMs = chartConf.timeframe.periodMs;
        name = chartConf.conf.name;
    }

    const dataPoints = seriesToBaseData(symbol, periodMs, series);

    if (chartConf === undefined) {
        return [
            dataPoints,
            {
                //
                conf: {
                    type: getType(series.Name),
                    name,
                    settings: getDefaultSettings(series.Name),
                    // TODO: we should also store series index somewhere
                },
                timeframe: {
                    symbol: timeframe,
                    periodMs: periodMs,
                },
                symbol,
                //seriesName: seriesName,  // TODO: need this?
                //isInRedis: false,   // marks if root element ('chart') for this algo has been stored in redis & is discoverable
                //bars: bars,
                consolidators: getCommonConsolidators(
                    periodMs,
                    BaseDataConsolidator,
                    () => {}
                ),
                consolidatorConstructor: BaseDataConsolidator,
            },
        ];
    }

    return [dataPoints, chartConf];
};

export default convertSingleLineIndicatorToSpline;
