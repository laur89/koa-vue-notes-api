import BaseDataConsolidator from '../../consolidators/BaseDataConsolidator.js';

import {
    getCommonConsolidators,
    seriesToBaseData,
    timeframeToPeriod,
} from '../LeanDataProcessorConf.js';

// TODO: move all regexes (regecies?) to config
const RSIRgx = /^RSI\((?<period>\d+),(?<movingAvgType>\w+),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)$/; // eg "RSI(14,Wilders,EURUSD_hr)"

const convertSingleLineIndicatorToSpline = (series, chartConf) => {
    let symbol, timeframe, periodMs, name;

    if (chartConf === undefined) {
        const match = RSIRgx.exec(series.Name);
        if (match === null)
            throw new Error(
                `Unexpected Indicators series name: [${series.Name}]`
            ); // sanity check
        name = match.input;
        //symbol = match.groups.symbol;  TODO make it dynamic
        symbol = 'RSI';
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
                    //type: sTypeTrans(series[seriesName].SeriesType),
                    type: 'RSI',
                    name,
                    settings: {
                        upper: 70,
                        lower: 30,
                        backColor: '#9b9ba316',
                        bandColor: '#666',
                    },
                    // TODO: we should also store series index somewhere
                },
                timeframe: {
                    symbol: timeframe,
                    periodMs: periodMs,
                },
                symbol: symbol,
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
