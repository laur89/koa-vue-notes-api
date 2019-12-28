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
        this.IsFillForward = false; // TODO: ok to default to false?
        this._time = null; // TODO ok to default to null?
        this.Symbol = ''; // TODO: defaults to Symbol.Empty;
    }

    /// <summary>
    /// Current time marker of this data packet.
    /// </summary>
    /// <remarks>All data is timeseries based.</remarks>
    set Time(value) {
        this._time = value;
    }
    get Time() {
        return this._time;
    }
    set EndTime(value) {
        this._time = value;
    }
    get EndTime() {
        return this._time;
    }
    set Value(value) {
        this._value = value;
    }
    get Value() {
        return this._value;
    }
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