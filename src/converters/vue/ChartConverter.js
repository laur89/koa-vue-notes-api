const tradeBarToVueCandleBar = bar => (
    [
        bar.Time.getTime() * 1000,  // trading-vue expects ns
        bar.Open,
        bar.High,
        bar.Low,
        bar.Close,
        0  // volume
    ]
);

export { tradeBarToVueCandleBar }