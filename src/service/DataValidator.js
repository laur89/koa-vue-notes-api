import logger from '../logs/log.js';

const m = new Map();

const getAlgoConf = algoId => {
    if (!m.has(algoId)) {
        const c = {
            seen: new Set(),
            prev: 0,
            totalCount: 0,
        };
        m.set(algoId, c);
        return c;
    }

    return m.get(algoId);
};

export default {
    feed(algoId, bars) {
        const c = getAlgoConf(algoId);

        let firstInBatch = true;
        bars.forEach(b => {
            c.totalCount++;
            const v = b[0];

            //logger.error(`comparing ${v} to ${prev}`);

            if (v < c.prev) {
                logger.error(
                    `  -> NEGATIVE TIME DELTA, firstInBatch: ${firstInBatch}`
                );
            } else if (v === c.prev) {
                logger.error(
                    `  -> DUPE at ${
                        c.prev
                    }, right after; ${b}, firstInBatch: ${firstInBatch}`
                );
            } else if (c.seen.has(v)) {
                logger.error(
                    `  -> DUPE at ${v} (from set), firstInBatch: ${firstInBatch}`
                );
            }

            c.prev = v;
            c.seen.add(v);
            firstInBatch = false;
        });
    },

    reset(algoId) {
        const c = getAlgoConf(algoId);

        logger.error(`TOTAL msg count ${c.totalCount}`);
        m.delete(algoId);
    },

    printRange(algoId) {
        const c = getAlgoConf(algoId);
        logger.error(
            `TOTAL msg range ${Math.min(...c.seen)} - ${Math.max(...c.seen)}`
        );
    },
};
