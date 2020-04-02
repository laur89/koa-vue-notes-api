const tradeBarToVueCandleBar = bar => [
    bar.Time.getTime(),
    bar.Open,
    bar.High,
    bar.Low,
    bar.Close,
    0, // volume
];

const channelBaseDataToVueDataPoint = args => {
    const d = [
        args[0].Time.getTime(), // all of the elements' times per one block should be the same
        //...args.map(x => x.Value),
    ];

    args.forEach(x => d.push(x.Value));

    return d;
};

const baseDataToVueDataPoint = dp => [dp.Time.getTime(), dp.Value];

export {
    tradeBarToVueCandleBar,
    baseDataToVueDataPoint,
    channelBaseDataToVueDataPoint,
};
