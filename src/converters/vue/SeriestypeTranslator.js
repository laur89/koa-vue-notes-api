import logger from '../../logs/log.js';

function t(type) {
    switch (type) {
        case 0:
            return 'Line';
        case 1:
            return 'Scatter';
        case 2:
            return 'Candle';
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
            throw new Error(`unsupported LEAN SeriesType ${type}`);
    }
}

export default t;
