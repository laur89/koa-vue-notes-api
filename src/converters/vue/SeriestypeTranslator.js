import logger from '../../logs/log.js';
import { SeriesType } from '../../constants/Global.js';

function t(type) {
    switch (type) {
        case 0:
            return SeriesType.Line;
        case 1:
            return SeriesType.Scatter;
        case 2:
            return SeriesType.Candle;
        case 3:
            return SeriesType.Bar;
        case 4:
            return SeriesType.Flag;
        case 5:
            return SeriesType.StackedArea;
        case 6:
            return SeriesType.Pie;
        case 7:
            return SeriesType.Treemap;
        default:
            throw new Error(`unsupported LEAN SeriesType ${type}`);
    }
}

export default t;
