// based on LEAN's Common/Data/Consolidators/PeriodCountConsolidatorBase.cs
import NotImplementedException from '../exceptions/NotImplementedException.js';
import ArgumentNullException from '../exceptions/ArgumentNullException.js';

export default class DataConsolidator {
    constructor() {
        /// <summary>
        /// Event handler that fires when a new piece of data is produced
        /// here for js, we have it assigned as array holding subscribed handlers
        /// </summary>
        this.DataConsolidated = [];

        /// <summary>
        /// Gets the most recently consolidated piece of data. This will be null if this consolidator
        /// has not produced any data yet.
        /// </summary>
        this.Consolidated = null;
    }

    /// <summary>
    /// ABSTRACT
    /// Scans this consolidator to see if it should emit a bar due to time passing
    /// </summary>
    /// <param name="currentLocalTime">The current time in the local time zone (same as <see cref="BaseData.Time"/>)</param>
    Scan(currentLocalTime) {}

    /// <summary>
    /// ABSTRACT
    /// Gets a clone of the data being currently consolidated
    /// </summary>
    WorkingData() {}

    /// <summary>
    /// Gets the type consumed by this consolidator
    /// </summary>
    InputType() {
        // TODO: how to do this in js?
    }

    /// <summary>
    /// ABSTRACT
    /// Gets the type produced by this consolidator
    /// </summary>
    OutputType() {}

    /// <summary>
    /// ABSTRACT
    /// Updates this consolidator with the specified data. This method is
    /// responsible for raising the DataConsolidated event
    /// </summary>
    /// <param name="data">The new data for the consolidator</param>
    Update(data) {}

    /// <summary>
    /// Event invocator for the DataConsolidated event. This should be invoked
    /// by derived classes when they have consolidated a new piece of data.
    /// </summary>
    /// <param name="consolidated">The newly consolidated data</param>
    OnDataConsolidated(consolidated) {
        if (this.DataConsolidated.length !== 0) {
            this.DataConsolidated.forEach(handler =>
                handler(this, consolidated)
            );
        }

        // assign the Consolidated property after the event handlers are fired,
        // this allows the event handlers to look at the new consolidated data
        // and the previous consolidated data at the same time without extra bookkeeping
        this.Consolidated = consolidated;
    }

    /// <summary>Performs application-defined tasks associated with freeing, releasing, or resetting unmanaged resources.</summary>
    /// <filterpriority>2</filterpriority>
    Dispose() {
        this.DataConsolidated = [];
    }
}
