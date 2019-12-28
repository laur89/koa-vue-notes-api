import BaseData from './BaseData.js';
import { MarketDataType } from '../constants/Global.js';

export default class TradeBar extends BaseData {
    /// <summary>
    /// Default initializer to setup an empty tradebar.
    /// </summary>
    constructor(
        symbol = '', // Symbol.Empty in LEAN
        dataType = MarketDataType.TradeBar,
        period = 60 * 1000 // default to 1m
    ) {
        super();
        this.setMembers();

        this.Symbol = symbol;
        this.DataType = dataType;
        this.Period = period;
    }

    setMembers() {
        this._initialized = 0;  // bool: 0-false 1-true; note bool type is not used as C# Interlocked.CompareExchange does not support types less than 32bits
        this._open = 0.0;
        this._high = 0.0;
        this._low = 0.0;

        this._volume = 0.0;
    }

    /// <summary>
    /// Update the tradebar - build the bar from this pricing information:
    /// </summary>
    /// <param name="lastTrade">This trade price</param>
    /// <param name="bidPrice">Current bid price (not used) </param>
    /// <param name="askPrice">Current asking price (not used) </param>
    /// <param name="volume">Volume of this trade</param>
    /// <param name="bidSize">The size of the current bid, if available</param>
    /// <param name="askSize">The size of the current ask, if available</param>
    Update(lastTrade, bidPrice, askPrice, volume, bidSize, askSize) {
        this.Initialize(lastTrade);
        if (lastTrade > this.High) this.High = lastTrade;
        if (lastTrade < this.Low) this.Low = lastTrade;
        //Volume is the total summed volume of trades in this bar:
        this.Volume += volume;
        //Always set the closing price;
        this.Close = lastTrade;
    }

    /// <summary>
    /// Initializes this bar with a first data point
    /// </summary>
    /// <param name="value">The seed value for this bar</param>
    Initialize(value) {
        if (this._initialized === 0) {
            this._initialized = 1;

            this._open = value;
            this._low = value;
            this._high = value;
        }
    }

    set Volume(value) {
        this._volume = value;
    }
    get Volume() {
        return this._volume;
    }

    /// <summary>
    /// Opening price of the bar: Defined as the price at the start of the time period.
    /// </summary>
    get Open() {
        return this._open;
    }

    set Open(value) {
        this.Initialize(value);
        this._open = value;
    }

    /// <summary>
    /// High price of the TradeBar during the time period.
    /// </summary>
    get High() {
        return this._high;
    }

    set High(value) {
        this.Initialize(value);
        this._high = value;
    }

    /// <summary>
    /// Low price of the TradeBar during the time period.
    /// </summary>
    get Low() {
        return this._low;
    }

    set Low(value) {
        this.Initialize(value);
        this._low = value;
    }

    /// <summary>
    /// Closing price of the TradeBar. Defined as the price at Start Time + TimeSpan.
    /// </summary>
    get Close() {
        return this.Value;
    }

    set Close(value) {
        this.Initialize(value);
        this.Value = value;
    }

    /// <summary>
    /// The closing time of this bar, computed via the Time and Period
    /// </summary>
    set EndTime(value) {
        this.Period = value - this.Time;
    }
    get EndTime() {
        return this.Time + this.Period;
    }
}
