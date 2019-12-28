//import logger from '../logs/log.js'
import Data from '../static-data/data.js';

/**
 * Returns an array with arrays of the given size.
 *
 * @param myArray {Array} Array to split
 * @param chunkSize {Integer} Size of every group
 */
const chunkArray = (myArray, chunk_size) => {
    let results = [];

    while (myArray.length) {
        results.push(myArray.splice(0, chunk_size));
    }

    return results;
};

class Mock {
    constructor() {
        this.payload = this.prepStaticData(1);
    }

    prepStaticData(chunkSize) {
        const p = {
            ohlcv: [],
            onchart: [
                {
                    name: 'EMA, 25',
                    type: 'EMA',
                    data: [],
                    settings: {},
                },
                {
                    name: 'EMA, 43',
                    type: 'EMA',
                    data: [],
                    settings: {},
                },
            ],
            offchart: [
                {
                    name: 'RSI, 20',
                    type: 'RSI',
                    data: [],
                    settings: {
                        upper: 70,
                        lower: 30,
                    },
                },
            ],
        };

        this.ohlcv = chunkArray(Data.ohlcv, chunkSize);
        this.ema25 = chunkArray(Data.onchart[0].data, chunkSize);
        this.ema43 = chunkArray(Data.onchart[1].data, chunkSize);
        this.offchart = chunkArray(Data.offchart[0].data, chunkSize);

        return p;
    }

    getNextSegment() {
        if (
            this.ohlcv.length ||
            this.ema25.length ||
            this.ema43.length ||
            this.offchart.length
        ) {
            this.ohlcv.length && this.payload.ohlcv.push(...this.ohlcv.shift());
            this.ema25.length &&
                this.payload.onchart[0].data.push(...this.ema25.shift());
            this.ema43.length &&
                this.payload.onchart[1].data.push(...this.ema43.shift());
            this.offchart.length &&
                this.payload.offchart[0].data.push(...this.offchart.shift());

            return this.payload;
        }

        return null;
    }
}

export default Mock;
