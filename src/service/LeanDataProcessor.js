import BaseDataConsolidator from '../consolidators/BaseDataConsolidator.js';
import channelTypeProcessor from './chart-processor/ChannelTypeProcessor.js';
import assetPriceProcessor from './chart-processor/AssetPriceProcessor.js';
import convertSingleLineIndicatorToSpline from './chart-processor/SingleLineProcessor.js';
import {
    tradeBarToVueCandleBar,
    baseDataToVueDataPoint,
    channelBaseDataToVueDataPoint,
} from '../converters/vue/ChartConverter.js';
import logger from '../logs/log.js';
import VueCandleRepo from '../repository/VueCandleRepo.js';
import redis from '../io/redisClientProvider.js';
import val from './DataValidator.js';

import {
    toBaseData,
    periodToTimeframe,
    ignoredCharts,
} from './LeanDataProcessorConf.js';

const volatileRuntimeChartConfigs = new Map(); // only used in-memory while chart/algo is still live; not to be persisted;
const chartSeriesWrittenToRedis = new Set();  // optimization to avoid unnecessary calls to redis; TODO: needs cleanup when feed has ended

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
        const baseConsolidatorPeriodMs = periodMs * 60; // TODO: is 60 a good multiplier for our base-consolidator?

        // TODO: where to push data of these semi-auto created consolidators?
        const onConsolidated = () => {};
        //const consolidators = getCommonConsolidators(periodMs, BaseDataConsolidator, onConsolidated);
        const consolidators = []; // TODO: lacking common/base/pre-defined consolidators atm
        if (!consolidators.some(c => c.Period === baseConsolidatorPeriodMs)) {
            const c = new BaseDataConsolidator(baseConsolidatorPeriodMs);
            c.DataConsolidated.push((sender, data) => {
                //                vueChart.chart.offchart[0].data.push(tradeBarToVueCandleBar(data));  TODO: uncomment this at one point
            });
            consolidators.push(c);
        }

        return [
            equityBaseData,
            {
                timeframe: {
                    symbol: periodToTimeframe(periodMs),
                    periodMs: periodMs, // TODO: only do this for first msg, think we should store this in working memory?
                },
                symbol: equitySymbol,
                //bars: equityBars,
                consolidators: consolidators,
                consolidatorConstructor: BaseDataConsolidator,
            },
        ];
    } else {
        return [equityBaseData, chartConf];
    }
};

export default class Processor {
    constructor(ioSock) {
        this.ioSock = ioSock.getSocket();
    }

    // TODO: is there even point in returning bars from per-chart processors/converters to this function?
    // guess some benefit might be in invoking consolidator.Update from a singular place;
    async processLeanChart(c, algoId) {
        if (ignoredCharts.includes(c.Name)) return;

        let chartConfId, chartConf, chartMissing, data;

        const fetchChartConf = () => {
            chartConf = volatileRuntimeChartConfigs.get(chartConfId);
            chartMissing = chartConf === undefined;
        };

        const postProcessCommon = async (toTvData, onOrOffChart) => {
            if (chartMissing) {
                // store chartConf in-mem if it was defined for the first time:
                volatileRuntimeChartConfigs.set(chartConfId, chartConf);
            }

            const tvData = data.map(toTvData); // convert to trading-vue compatible format
            const liveUpdatePayload = onOrOffChart
                ? {
                      [onOrOffChart]: [
                          {
                              ...chartConf.conf,
                              data: tvData,
                          },
                      ],
                  }
                : {
                      chart: {
                          ...chartConf.conf,
                          data: tvData,
                      },
                  };
            this.ioSock.to(algoId).emit('data', liveUpdatePayload);

            val.feed(algoId, tvData); // TODO: is this common enough?
            /////////////////////////
            // TODO: perhaps more efficient to check if key that stars w/ 'algoId:chart:' exists? that'd mean that chart,on-offChart are stored under separate keys tho...
            // then again, we'd only win on read, as we expect it all to be there...
            // TODO2: put this guy also into node-cache for even faster access?
            if (!chartSeriesWrittenToRedis.has(chartConfId)) {

                await redis.get(algoId).then(result => {
                    const cnf = {
                        readRepo: 'vueCandle', // so we know which repo implementation to read the data with
                        conf: chartConf.conf,
                        id: chartConfId, // for accessing persisted candle data later on;
                    };

                    if (!result) {  // null if not found
                        result = onOrOffChart
                            ? {
                                  running: true,
                                  chart: null, // have to indicate main chart has not been initialized yet
                                  onchart: [],
                                  offchart: [],
                              }
                            : {
                                  running: true,
                                  chart: cnf,
                                  onchart: [],
                                  offchart: [],
                              };
                        onOrOffChart && result[onOrOffChart].push(cnf);
                    } else {  // conf exists, update the relevant bit(s):
                        result = JSON.parse(result);
                        if (onOrOffChart) {
                            if (
                                result[onOrOffChart].find(
                                    oc => oc.id === chartConfId
                                ) === undefined
                            ) {
                                result[onOrOffChart].push(cnf);
                            }
                        } else if (result.chart === null) {  // main chart
                            result.chart = cnf;
                        }
                    }

                    return redis.set(algoId, JSON.stringify(result)); // TODO log out write errors!
                }).then(() => {
                    chartSeriesWrittenToRedis.add(chartConfId);
                });
            }

            //redis.set(`${algoId}_chart_conf`, JSON.stringify(chartConf.conf));  // think all chart conf is ok to store under <algoId> key

            // store data in redis:
            tvData.forEach(d => VueCandleRepo.write(chartConfId, d));
        };

        switch (c.Name) {
            case 'Asset Price':
                chartConfId = `${algoId}:chart:${c.Name}`;
                fetchChartConf();
                [data, chartConf] = assetPriceProcessor(c, chartConf);
                await postProcessCommon(tradeBarToVueCandleBar, false);

                chartConf.consolidators.forEach(consolidator => {
                    data.forEach(consolidator.Update, consolidator); // TODO: can be made common?
                    // TODO: Scan doesn't make much sense in backtest, does it?
                    //consolidator.Scan(timeKeeper.GetLocalTimeKeeper(update.Target.ExchangeTimeZone).LocalTime);
                });
                break;
            case 'Indicators': // TODO: should we already vet here whether we have logic to process given indicator, not check downstream?
                for (const sKey in c.Series) {
                    const onOffChart = 'offchart'; // TODO: always offchart? sounds like bold assumption;
                    chartConfId = `${algoId}:${onOffChart}:${c.Name}:${sKey}`;
                    fetchChartConf();
                    [data, chartConf] = convertSingleLineIndicatorToSpline(
                        c.Series[sKey],
                        chartConf
                    );
                    await postProcessCommon(baseDataToVueDataPoint, onOffChart);

                    chartConf.consolidators.forEach(consolidator => {
                        data.forEach(consolidator.Update, consolidator); // TODO: can be made common?
                        // TODO: Scan doesn't make much sense in backtest, does it?
                        //consolidator.Scan(timeKeeper.GetLocalTimeKeeper(update.Target.ExchangeTimeZone).LocalTime);
                    });
                }

                break;
            case 'BB': // special case, can't solve universally under 'Indicators'
                const onOffChart = 'onchart';
                chartConfId = `${algoId}:${onOffChart}:${c.Name}:${
                    Object.keys(c.Series)[0]
                }`; // TODO: need to append _a_ series name to the chartCOnf if?
                fetchChartConf();
                [data, chartConf] = channelTypeProcessor(c, chartConf);
                await postProcessCommon(channelBaseDataToVueDataPoint, onOffChart);

                chartConf.consolidators.forEach(consolidator => {
                    data.forEach(consolidator.Update, consolidator); // TODO: can be made common?
                    // TODO: Scan doesn't make much sense in backtest, does it?
                    //consolidator.Scan(timeKeeper.GetLocalTimeKeeper(update.Target.ExchangeTimeZone).LocalTime);
                });
                break;
            case 'Strategy Equity':
                return; // TODO: move this block to plc()

                [data, chartConf] = processStratEquity(c, chartConf);
                //getCommonConsolidators(periodMs, TradeBarConsolidator, () => {})
                //vueChart.chart.offchart[0].data.push(...bars);
                break;
            default:
                // TODO: should we actively blacklist charts (ignoredCharts), and log errors here if unknown is ocurred, or just drop non-white list ones?
                return;
        }
    }
}
