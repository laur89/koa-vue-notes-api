/// <summary>
/// Market data style: is the market data a summary (OHLC style) bar, or is it a time-price value.
/// </summary>
const MarketDataType = {
    /// Base market data type
    Base: 'Base',
    /// TradeBar market data type (OHLC summary bar)
    TradeBar: 'TradeBar',
    /// Tick market data type (price-time pair)
    Tick: 'Tick',
    /// Data associated with an instrument
    Auxiliary: 'Auxiliary',
    /// QuoteBar market data type [Bid(OHLC), Ask(OHLC) and Mid(OHLC) summary bar]
    QuoteBar: 'QuoteBar',
    /// Option chain data
    OptionChain: 'OptionChain',
    /// Futures chain data
    FuturesChain: 'FuturesChain',
};

/// <summary>
/// Resolution of data requested.
/// </summary>
/// <remarks>Always sort the enum from the smallest to largest resolution</remarks>
const Resolution = {
    /// Tick Resolution (1)
    Tick: 'Tick',
    /// Second Resolution (2)
    Second: 'Second',
    /// Minute Resolution (3)
    Minute: 'Minute',
    /// Hour Resolution (4)
    Hour: 'Hour',
    /// Daily Resolution (5)
    Daily: 'Daily',
};
const Resolutions = Object.getOwnPropertyNames(Resolution);

/// <summary>
/// Type of tradable security / underlying asset
/// </summary>
const SecurityType = {
    /// <summary>
    /// Base class for all security types:
    /// </summary>
    Base: 'Base',

    /// <summary>
    /// US Equity Security
    /// </summary>
    Equity: 'Equity',

    /// <summary>
    /// Option Security Type
    /// </summary>
    Option: 'Option',

    /// <summary>
    /// Commodity Security Type
    /// </summary>
    Commodity: 'Commodity',

    /// <summary>
    /// FOREX Security
    /// </summary>
    Forex: 'Forex',

    /// <summary>
    /// Future Security Type
    /// </summary>
    Future: 'Future',

    /// <summary>
    /// Contract For a Difference Security Type.
    /// </summary>
    Cfd: 'Cfd',

    /// <summary>
    /// Cryptocurrency Security Type.
    /// </summary>
    Crypto: 'Crypto',
};

/// <summary>
/// Available types of charts
/// </summary>
const SeriesType = {
    /// Line Plot for Value Types
    Line: 'Line',
    /// Scatter Plot for Chart Distinct Types
    Scatter: 'Scatter',
    /// Charts
    Candle: 'Candle',
    /// Bar chart.
    Bar: 'Bar',
    /// Flag indicators
    Flag: 'Flag',
    /// 100% area chart showing relative proportions of series values at each time index
    StackedArea: 'StackedArea',
    /// Pie chart
    Pie: 'Pie',
    /// Treemap Plot
    Treemap: 'Treemap'
};

export { MarketDataType, Resolution, Resolutions, SecurityType, SeriesType };
