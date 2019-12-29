import BaseData from './BaseData.js';
import TradeBar from './TradeBar.js';
import Bar from './Bar.js';
import IDate from '../utils/IDate.js';
import {
    MarketDataType,
} from '../constants/Global.js';

/// <summary>
/// QuoteBar class for second and minute resolution data:
/// An OHLC implementation of the QuantConnect BaseData class with parameters for candles.
/// </summary>
export default class QuoteBar extends BaseData {

    /// <summary>
    /// Default initializer to setup an empty quotebar.
    /// </summary>
    constructor() {
        super();
        this.setMembers();

        this.Symbol = ''; // Symbol.Empty in LEAN
        this.Time = new IDate();

        /// <summary>
        /// Bid OHLC
        /// </summary>
        this.Bid = new Bar();

        /// <summary>
        /// Ask OHLC
        /// </summary>
        this.Ask = new Bar();

        this.Value = 0.0;
        this.Period = 60 * 1000; // default to 1m
        this.DataType = MarketDataType.QuoteBar;
    }

    setMembers() {
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
        if (this.Bid !== null && this.Ask !== null) {
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
    get EndTime() {
        return this.Time + this.Period;
    }
    set EndTime(value) {
        this.Period = value - this.Time;
    }

    /// <summary>
    /// Return a new instance clone of this quote bar, used in fill forward
    /// </summary>
    /// <returns>A clone of the current quote bar</returns>
    Clone() {
        const qb = new QuoteBar();

        qb.Ask = this.Ask === null ? null : this.Ask.Clone();
        qb.Bid = this.Bid === null ? null : this.Bid.Clone();
        qb.LastAskSize = this.LastAskSize;
        qb.LastBidSize = this.LastBidSize;
        qb.Symbol = this.Symbol;
        qb.Time = this.Time;
        qb.Period = this.Period;
        qb.Value = this.Value;
        qb.DataType = this.DataType;

        return qb;
    }

    /// <summary>
    /// Collapses QuoteBars into TradeBars object when
    ///  algorithm requires FX data, but calls OnData(<see cref="TradeBars"/>)
    /// TODO: (2017) Remove this method in favor of using OnData(<see cref="Slice"/>)
    /// </summary>
    /// <returns><see cref="TradeBars"/></returns>
    Collapse() {
        const tb = new TradeBar();

        tb.Time = this.Time;
        tb.Symbol = this.Symbol;
        tb.Open = this.Open;
        tb.High = this.High;
        tb.Low = this.Low;
        tb.Close = this.Close;
        tb.Volume = 0;  // should be set anyway at the constructor?
        tb.Period = this.Period;

        return tb;
    }
}
