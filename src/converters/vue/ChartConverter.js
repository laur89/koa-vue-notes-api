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

export { tradeBarToVueCandleBar }