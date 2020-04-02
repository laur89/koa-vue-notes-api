import logger from '../../logs/log.js';
import { SeriesType } from '../../constants/Global.js';

// TODO: incomplete
export default function t(leanChartTypeOrIndicator) {
    switch (leanChartTypeOrIndicator) {
        case SeriesType.Line:
            return 'Line';
        case SeriesType.Candle:
            return 'Candles';
        case 1:
            return 'Scatter';
        case 3:
            return 'Bar';
        case 4:
            return 'Flag';
        case 5:
            return 'StackedArea';
        case 6:
            return 'Pie';
        case 7:
            return 'Treemap';
        default:
            throw new Error(
                `unsupported LEAN SeriesType ${leanChartTypeOrIndicator}`
            );
    }

    // Channel (KC,BB), Range (RSI), Trades, Splines (DMI),  Spline (EMA,SMA), Segment, Candles, Volume, Splitters, LineTool, RangeTool,
}
