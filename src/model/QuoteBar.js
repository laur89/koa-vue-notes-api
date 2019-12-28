import BaseData from './BaseData.js';
import Bar from './Bar.js';
import {
    MarketDataType,
    Resolution,
    Resolutions,
    SecurityType,
} from '../constants/Global.js';

export default class QuoteBar extends BaseData {
    /// <summary>
    /// Default initializer to setup an empty quotebar.
    /// </summary>
    constructor(
        symbol = '', // Symbol.Empty in LEAN
        time = new Date(),
        bid = new Bar(),
        ask = new Bar(),
        value = 0,
        period = 60 * 1000, // default to 1m
        dataType = MarketDataType.QuoteBar
    ) {
        super();
        this.setMembers();

        this.Symbol = symbol;
        this.Time = time;
        this.Bid = bid;
        this.Ask = ask;
        this.Value = value;
        this.Period = period;
        this.DataType = dataType;
    }

    setMembers() {
        // TODO: unsure if necessary for us
        /// <summary>
        /// Average bid size
        /// </summary>
        this.LastBidSize = 0.0;

        /// <summary>
        /// Average ask size
        /// </summary>
        this.LastAskSize = 0.0;
    }

    /// <summary>
    /// Opening price of the bar: Defined as the price at the start of the time period.
    /// </summary>
    get Open() {
        if (this.Bid !== null && this.Ask !== null) {
            if (this.Bid.Open !== 0 && this.Ask.Open !== 0)
                return (this.Bid.Open + this.Ask.Open) / 2.0;

            if (this.Bid.Open !== 0) return this.Bid.Open;
            if (this.Ask.Open !== 0) return this.Ask.Open;

            return 0;
        }
        if (this.Bid !== null) {
            return this.Bid.Open;
        }
        if (this.Ask !== null) {
            return this.Ask.Open;
        }
        return 0;
    }

    /// <summary>
    /// High price of the QuoteBar during the time period.
    /// </summary>
    get High() {
        if (this.Bid !== null && this.Ask != null) {
            if (this.Bid.High !== 0 && this.Ask.High !== 0)
                return (this.Bid.High + this.Ask.High) / 2.0;

            if (this.Bid.High !== 0) return this.Bid.High;
            if (this.Ask.High !== 0) return this.Ask.High;

            return 0;
        }
        if (this.Bid !== null) {
            return this.Bid.High;
        }
        if (this.Ask !== null) {
            return this.Ask.High;
        }
        return 0;
    }

    /// <summary>
    /// Low price of the QuoteBar during the time period.
    /// </summary>
    get Low() {
        if (this.Bid !== null && this.Ask !== null) {
            if (this.Bid.Low !== 0 && this.Ask.Low !== 0)
                return (this.Bid.Low + this.Ask.Low) / 2.0;

            if (this.Bid.Low !== 0) return this.Bid.Low;
            if (this.Ask.Low !== 0) return this.Ask.Low;

            return 0;
        }
        if (this.Bid !== null) {
            return this.Bid.Low;
        }
        if (this.Ask !== null) {
            return this.Ask.Low;
        }
        return 0;
    }

    /// <summary>
    /// Closing price of the QuoteBar. Defined as the price at Start Time + TimeSpan.
    /// </summary>
    get Close() {
        if (this.Bid !== null && this.Ask !== null) {
            if (this.Bid.Close !== 0 && this.Ask.Close !== 0)
                return (this.Bid.Close + this.Ask.Close) / 2.0;

            if (this.Bid.Close !== 0) return this.Bid.Close;
            if (this.Ask.Close !== 0) return this.Ask.Close;

            return 0;
        }
        if (this.Bid !== null) {
            return this.Bid.Close;
        }
        if (this.Ask !== null) {
            return this.Ask.Close;
        }
        return this.Value;
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
