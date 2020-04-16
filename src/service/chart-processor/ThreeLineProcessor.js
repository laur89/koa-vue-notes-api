import BaseDataConsolidator from '../../consolidators/BaseDataConsolidator.js';
import logger from '../../logs/log.js';

import {
    getCommonConsolidators,
    toBaseData,
    timeframeToPeriod,
} from '../LeanDataProcessorConf.js';

const ADXRgx = /^ADX\((?<period>\d+),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)(_(?<band>\w+))?$/; // eg "ADX(14,EURUSD_min)_PositiveDirectionalIndex"
const ADXNameRgx = /^ADX\(\S+\)/; // eg extract "ADX(14,EURUSD_min)" out of "ADX(14,EURUSD_min)_PositiveDirectionalIndex"
// ADX(14,EURUSD_min)_PositiveDirectionalIndex
// ADX(14,EURUSD_min)

const convertAdxIndicatorToSplines = (chart, chartConf) => {
    const series = chart.Series;
    let name, symbol, timeframe, periodMs;

    if (chartConf === undefined) {
        const firstSeriesName = Object.keys(series)[0];
        const match = ADXRgx.exec(firstSeriesName); // pick _any_ series for metadata extraction
        if (match === null)
            throw new Error(
                `Unexpected ${chart.Name} series name: [${
                    Object.keys(series)[0]
                }]`
            ); // sanity check
        symbol = match.groups.symbol;

        name = firstSeriesName.match(ADXNameRgx)[0];
        //const period = match.groups.period; // TODO: needed?

        timeframe = match.groups.timeframe;
        periodMs = timeframeToPeriod(timeframe);
    } else {
        symbol = chartConf.symbol;
        name = chartConf.conf.name;
        //timeframe = chartConf.timeframe.symbol;
        //periodMs = chartConf.timeframe.periodMs;
    }

    const adx = series[`${name}`].Values;
    const posIndex = series[`${name}_PositiveDirectionalIndex`].Values;
    const negIndex = series[`${name}_NegativeDirectionalIndex`].Values;

    if (
        !(adx.length !== 0 && adx.length === posIndex.length && adx.length === negIndex.length)
    ) {
        throw new Error(
            `${name} basedata series lengths didn't match or were equal to 0`
        );
    }

    const data = [];
    for (let i = 0; i < adx.length; i++) {
        data.push([
            toBaseData(symbol, periodMs, adx[i]),
            toBaseData(symbol, periodMs, posIndex[i]),
            toBaseData(symbol, periodMs, negIndex[i]),
        ]);
    }

    if (chartConf === undefined) {
        return [
            data,
            {
                //
                conf: {
                    type: 'Splines', // or DMI
                    name,
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
                    BaseDataConsolidator,
                    () => {}
                ),
                consolidatorConstructor: BaseDataConsolidator,
            },
        ];
    }

    return [data, chartConf];
};

export default convertAdxIndicatorToSplines;
