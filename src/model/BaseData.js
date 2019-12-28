import {
    MarketDataType,
    Resolution,
    Resolutions,
    SecurityType
} from '../constants/Global.js';

export default class BaseData {
    constructor() {
        this._value = 0.0;
        this.AllResolutions = Resolutions;
        this.DailyResolution = [Resolution.Daily];
        this.MinuteResolution = [Resolution.Minute];
        this.DataType = MarketDataType.Base;
        this._isFillFwd = false;

        /// <summary>
        /// Current time marker of this data packet.
        /// </summary>
        /// <remarks>All data is timeseries based.</remarks>
        this.Time = null; // TODO ok to default to null?

        /// <summary>
        /// Symbol representation for underlying Security
        /// </summary>
        this.Symbol = ''; // TODO: defaults to Symbol.Empty;
    }

    /// <summary>
    /// True if this is a fill forward piece of data
    /// Note we don't define setter - that should not be public.
    /// </summary>
    get IsFillForward() {
        return this._isFillFwd;
    }

    /// <summary>
    /// The end time of this data. Some data covers spans (trade bars) and as such we want
    /// to know the entire time span covered
    /// </summary>
    get EndTime() {
        return this.Time;
    }
    set EndTime(value) {
        this.Time = value;
    }

    /// <summary>
    /// Value representation of this data packet. All data requires a representative value for this moment in time.
    /// For streams of data this is the price now, for OHLC packets this is the closing price.
    /// </summary>
    get Value() {
        return this._value;
    }
    set Value(value) {
        this._value = value;
    }
    /// <summary>
    /// As this is a backtesting platform we'll provide an alias of value as price.
    /// </summary>
    get Price() {
        return this._value;
    }

    /// <summary>
    /// Indicates if there is support for mapping
    /// </summary>
    /// <remarks>Relies on the <see cref="Symbol"/> property value</remarks>
    /// <returns>True indicates mapping should be used</returns>
    RequiresMapping() {
        return (
            this.Symbol.SecurityType === SecurityType.Equity ||
            this.Symbol.SecurityType === SecurityType.Option
        );
    }

    /// <summary>
    /// Indicates that the data set is expected to be sparse
    /// </summary>
    /// <remarks>Relies on the <see cref="Symbol"/> property value</remarks>
    /// <remarks>This is a method and not a property so that python
    /// custom data types can override it</remarks>
    /// <returns>True if the data set represented by this type is expected to be sparse</returns>
    IsSparseData() {
        // by default, we'll assume all custom data is sparse data
        return this.Symbol.SecurityType === SecurityType.Base;
    }

    /// <summary>
    /// Gets the default resolution for this data and security type
    /// </summary>
    /// <remarks>This is a method and not a property so that python
    /// custom data types can override it</remarks>
    DefaultResolution() {
        return Resolution.Minute;
    }

    /// <summary>
    /// Gets the supported resolution for this data and security type
    /// </summary>
    /// <remarks>Relies on the <see cref="Symbol"/> property value</remarks>
    /// <remarks>This is a method and not a property so that python
    /// custom data types can override it</remarks>
    SupportedResolutions() {
        if (this.Symbol.SecurityType === SecurityType.Option) {
            return this.MinuteResolution;
        }

        return this.AllResolutions;
    }
}