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
    /// Update the quotebar - build the bar from this pricing information:
    /// </summary>
    /// <param name="lastTrade">The last trade price</param>
    /// <param name="bidPrice">Current bid price</param>
    /// <param name="askPrice">Current asking price</param>
    /// <param name="volume">Volume of this trade</param>
    /// <param name="bidSize">The size of the current bid, if available, if not, pass 0</param>
    /// <param name="askSize">The size of the current ask, if available, if not, pass 0</param>
    Update(lastTrade, bidPrice, askPrice, volume, bidSize, askSize) {
        // update our bid and ask bars - handle null values, this is to give good values for midpoint OHLC
        if (this.Bid === null && bidPrice !== 0) this.Bid = new Bar();
        if (this.Bid !== null) this.Bid.Update(bidPrice);

        if (this.Ask === null && askPrice !== 0) this.Ask = new Bar();
        if (this.Ask !== null) this.Ask.Update(askPrice);

        if (bidSize > 0) {
            this.LastBidSize = bidSize;
        }

        if (askSize > 0) {
            this.LastAskSize = askSize;
        }

        // be prepared for updates without trades
        if (lastTrade !== 0) this.Value = lastTrade;
        else if (askPrice !== 0) this.Value = askPrice;
        else if (bidPrice !== 0) this.Value = bidPrice;
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
