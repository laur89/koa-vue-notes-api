const tradeBarToVueCandleBar = bar => (
    [
        bar.Time.getTime(),
        bar.Open,
        bar.High,
        bar.Low,
        bar.Close,
        0  // volume
    ]
);

const baseDataToVueDataPoint = dp => (
    [
        dp.Time.getTime(),
        dp.Value,
    ]
);

export { tradeBarToVueCandleBar, baseDataToVueDataPoint }