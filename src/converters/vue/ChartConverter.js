import logger from '../../logs/log.js';
import sTypeTrans from '../vue/SeriestypeTranslator.js';

const ignoredTypes = ['Debug'];
const msgTypes = new Map();
const eTypeToHasChartsCount = new Map();
const hasores = new Map();
const charts = new Map();

export default {
    convert(i) {
        const result = {};
        if (i.hasOwnProperty('oResults')) {
            if (!i['oResults'].hasOwnProperty('Charts')) return null;

            let charts = i['oResults']['Charts'];
            for (const chartName in charts) {
                if (chartName !== 'Strategy Equity') return null; // TODO atm only processing a single chart
                result['chartName'] = chartName;
                let c = charts[chartName];
                let series = c['Series'];

                // TODO: these 2 'ohlcv' blocks below were wishful thinking, haven't tested yet:
                result['ohlcv'] = series['Equity']['Values'].map(leanInput => [
                    leanInput['x'] * 1000,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    volume,
                ]);

                result['ohlcv'] = series['Daily Performance']['Values'].map(
                    leanInput => [
                        leanInput['x'] * 1000,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        leanInput['y'],
                    ]
                );

                for (const seriesName in series) {
                    let s = series[seriesName];
                    logger.debug(
                        `chart [${chartName}]:series [${
                            s['Name']
                        }] type: [${sTypeTrans(s['SeriesType'])}]`
                    );
                }
            }
        }

        return null;
    },
};
