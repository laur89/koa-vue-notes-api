import InvalidOperationException from '../exceptions/InvalidOperationException.js';
import DataConsolidator from './DataConsolidator.js';
import TradeBar from '../model/TradeBar.js';
import IDate from '../utils/IDate.js';

/// Provides a base class for consolidators that emit data based on the passing of a period of time
/// or after seeing a max count of data points.
/// </summary>
/// <typeparam name="T">The input type of the consolidator</typeparam>
/// <typeparam name="TConsolidated">The output type of the consolidator</typeparam>
export default class PeriodCountConsolidatorBase extends DataConsolidator {
    constructor(timeSpan) {
        super();
        this.setMembers();

        this._periodSpecification = new TimeSpanPeriodSpecification(timeSpan);
        this._period = this._periodSpecification.Period;
    }

    setMembers() {
        // The symbol that we are consolidating for.
        this.symbol = null;
        //The number of data updates between creating new bars.
        this._maxCount = null; // nullable in C#; otherwise int
        //
        this._periodSpecification = null;
        //The minimum timespan between creating new bars.
        this._period = null; // nullable in C#
        //The number of pieces of data we've accumulated since our last emit
        this._currentCount = 0;
        //The working bar used for aggregating the data
        this._workingBar = null;
        //The last time we emitted a consolidated bar
        this._lastEmit = null; // nullable in C#, otherwise DateTime
    }

    /// <summary>
    /// Updates this consolidator with the specified data. This method is
    /// responsible for raising the DataConsolidated event
    /// In time span mode, the bar range is closed on the left and open on the right: [T, T+TimeSpan).
    /// For example, if time span is 1 minute, we have [10:00, 10:01): so data at 10:01 is not
    /// included in the bar starting at 10:00.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when multiple symbols are being consolidated.</exception>
    /// <param name="data">The new data for the consolidator</param>
    Update(data) {
        if (this.symbol === null) {
            this.symbol = data.Symbol;
        } else if (this.symbol !== data.Symbol) {
            throw new InvalidOperationException(`Consolidators can only be used with a single symbol. The previous consolidated symbol (${this.symbol}) is not the same as in the current data (${data.Symbol}).`);
        }

        if (!this.ShouldProcess(data)) {
            // first allow the base class a chance to filter out data it doesn't want
            // before we start incrementing counts and what not
            return;
        }

        //Decide to fire the event
        let fireDataConsolidated = false;

        // decide to aggregate data before or after firing OnDataConsolidated event
        // always aggregate before firing in counting mode
        let aggregateBeforeFire = this._maxCount !== null;

        if (this._maxCount !== null) {
            // we're in count mode
            this._currentCount++;
            if (this._currentCount >= this._maxCount) {
                this._currentCount = 0;
                fireDataConsolidated = true;
            }
        }

        if (this._lastEmit === null) {
            // initialize this value for period computations
            this._lastEmit = this.IsTimeBased() ? new IDate(0) : data.Time;
        }

        if (this._period !== null) {
            // we're in time span mode and initialized
            if (
                this._workingBar !== null &&
                data.Time - this._workingBar.Time >= this._period &&
                this.GetRoundedBarTime(data.Time) > this._lastEmit
            ) {
                // TODO: can we compare Date/time like this?
                fireDataConsolidated = true;
            }

            // special case: always aggregate before event trigger when TimeSpan is zero
            if (this._period === 0) {
                fireDataConsolidated = true;
                aggregateBeforeFire = true;
            }
        }

        if (aggregateBeforeFire) {
            if (data.Time >= this._lastEmit) {
                // TODO can we compare Date/time like this?
                this._workingBar = this.AggregateBar(this._workingBar, data); // Note this differs from C# - there AggregateBar does not return;
            }
        }

        //Fire the event
        if (fireDataConsolidated) {
            if (this._workingBar instanceof TradeBar) {
                // note in C# we had to cast: "var workingTradeBar = _workingBar as TradeBar;"
                // we kind of are cheating here...
                if (this._period !== null) {
                    this._workingBar.Period = this._period;
                }
                // since trade bar has period it aggregates this properly
                else if (!(data instanceof TradeBar)) {
                    this._workingBar.Period = data.Time - this._lastEmit;
                }
            }

            this.OnDataConsolidated(this._workingBar);
            this._lastEmit =
                this.IsTimeBased() && this._workingBar !== null
                    ? this._workingBar.Time.Add(
                          this.Period !== null ? this.Period : 0
                      )
                    : data.Time;
            this._workingBar = null;
        }

        if (!aggregateBeforeFire) {
            if (data.Time >= this._lastEmit) {
                this._workingBar = this.AggregateBar(this._workingBar, data); // Note this differs from C# - there AggregateBar does not return;
            }
        }
    }

    /// <summary>
    /// Scans this consolidator to see if it should emit a bar due to time passing
    /// </summary>
    /// <param name="currentLocalTime">The current time in the local time zone (same as <see cref="BaseData.Time"/>)</param>
    Scan(currentLocalTime) {
        if (this._period !== null && this._workingBar !== null) {
            currentLocalTime = this.GetRoundedBarTime(currentLocalTime);

            if (
                this._period !== 0 &&
                currentLocalTime - this._workingBar.Time >= this._period &&
                currentLocalTime > this._lastEmit
            ) {
                //  TODO time comparison
                this.OnDataConsolidated(this._workingBar);
                this._lastEmit = currentLocalTime;
                this._workingBar = null;
            }
        }
    }

    /// <summary>
    /// Returns true if this consolidator is time-based, false otherwise
    // TODO: convert to property as is in C#?
    /// </summary>
    IsTimeBased() {
        return this._maxCount === null;
    }

    /// <summary>
    /// Gets the time period for this consolidator
    /// </summary>
    get Period() {
        return this._period;
    }

    /// <summary>
    /// Determines whether or not the specified data should be processed
    /// </summary>
    /// <param name="data">The data to check</param>
    /// <returns>True if the consolidator should process this data, false otherwise</returns>
    ShouldProcess(data) {
        return true;
    }

    /// <summary>
    /// ABSTRACT!
    /// Aggregates the new 'data' into the 'workingBar'. The 'workingBar' will be
    /// null following the event firing
    /// </summary>
    /// <param name="workingBar">The bar we're building, null if the event was just fired and we're starting a new consolidated bar</param>
    /// <param name="data">The new data</param>
    /// <returns>workingBar after aggregation. Note this differs from C# - there we pass bar as a ref!</returns>
    AggregateBar(workingBar, data) {}

    /// <summary>
    /// Gets a rounded-down bar time. Called by AggregateBar in derived classes.
    /// </summary>
    /// <param name="time">The bar time to be rounded down</param>
    /// <returns>The rounded bar time</returns>
    GetRoundedBarTime(time) {
        const barTime = this._periodSpecification.GetRoundedBarTime(time);

        // In the case of a new bar, define the period defined at opening time
        if (this._workingBar === null) {
            this._period = this._periodSpecification.Period;
        }

        return barTime;
    }

    /// <summary>
    /// Event invocator for the <see cref="DataConsolidated"/> event
    /// </summary>
    /// <param name="e">The consolidated data</param>
    //OnDataConsolidated(e) {
    //super.OnDataConsolidated(e);

    // TODO: different than in C#, where DataConsolidated was re-declared under PCCBase:
    //if (this.DataConsolidated.length !== 0) {
    //this.DataConsolidated.forEach(handler => handler(this, e));
    //}
    //}
}

/// <summary>
/// User defined the bars period using a time span
/// </summary>
class TimeSpanPeriodSpecification {
    constructor(timeSpanPeriod) {
        // TODO: in LEAN, Period was Nullable
        this.Period = timeSpanPeriod; // TimeSpan value in LEAN
    }

    GetRoundedBarTime(time) {
        return time.RoundDown(this.Period);
    }
}