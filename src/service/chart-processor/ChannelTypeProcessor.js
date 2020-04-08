import BaseDataConsolidator from '../../consolidators/BaseDataConsolidator.js';
import logger from '../../logs/log.js';

import {
    getCommonConsolidators,
    toBaseData,
    timeframeToPeriod,
} from '../LeanDataProcessorConf.js';

// TODO: add KC logic
const BBRgx = /^BB\((?<period>\d+),(?<noStdDeviations>\d+(\.\d+)?),(?<symbol>[A-Z]+)_(?<timeframe>\w+)\)_(?<band>\w+)$/; // eg "BB(20,2.2,EURUSD_day)_MiddleBand"
const BBNameRgx = /^BB\(\S+\)/; // eg extract "BB(20,2.2,EURUSD_day)" out of "BB(20,2.2,EURUSD_day)_MiddleBand"
//BB(20,2,EURUSD_min)
//BB(20,2.2,EURUSD_day)_MiddleBand

const convertChannelIndicatorToSplines = (chart, chartConf) => {
    const series = chart.Series;
    let name, symbol, timeframe, periodMs;

    if (chartConf === undefined) {
        const firstSeriesName = Object.keys(series)[0];
        const match = BBRgx.exec(firstSeriesName); // pick _any_ series for metadata extractiong
        if (match === null)
            throw new Error(
                `Unexpected ${chart.Name} series name: [${
                    Object.keys(series)[0]
                }]`
            ); // sanity check
        symbol = match.groups.symbol;
        //        name = BBNameRgx.exec(firstSeriesName)[0];

        name = firstSeriesName.match(BBNameRgx)[0];
        const period = match.groups.period; // TODO: needed?
        const noStdDeviations = match.groups.noStdDeviations; // TODO: needed?

        timeframe = match.groups.timeframe;
        periodMs = timeframeToPeriod(timeframe);
    } else {
        symbol = chartConf.symbol;
        name = chartConf.conf.name;
        //timeframe = chartConf.timeframe.symbol;
        //periodMs = chartConf.timeframe.periodMs;
    }

    const ub = series[`${name}_UpperBand`].Values;
    const mb = series[`${name}_MiddleBand`].Values;
    const lb = series[`${name}_LowerBand`].Values;

    if (
        !(ub.length !== 0 && ub.length === mb.length && ub.length === lb.length)
    ) {
        throw new Error(
            `${name} basedata series lengths didn't match or were equal to 0`
        );
    }

    const data = [];
    for (let i = 0; i < ub.length; i++) {
        data.push([
            toBaseData(symbol, periodMs, ub[i]),
            toBaseData(symbol, periodMs, mb[i]),
            toBaseData(symbol, periodMs, lb[i]),
        ]);
    }

    if (chartConf === undefined) {
        return [
            data,
            {
                //
                conf: {
                    type: 'Channel', // or BB or KC
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

export default convertChannelIndicatorToSplines; // TODO: would this be fine? accept (chart & cConf), return [data, cConf]
