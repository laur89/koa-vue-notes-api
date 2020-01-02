export default class IDate extends Date {
    constructor(ms) {
        super(ms);
    }

    addMillis(ms) {
        //  TODO: side-effect or return new object?
        //this.setTime(this.getTime() + ms);
        //return this;
        return new IDate(this.getTime() + ms);
    }

    Add(ms) {
        return this.addMillis(ms);
    }

    Clone() {
        return new IDate(this.getTime());
    }

    /// <summary>
    /// Extension method to round a datetime down by a timespan interval.
    ///
    /// Note in C# it was also DateTime extension.
    /// </summary>
    /// <param name="this">Base DateTime object we're rounding down.</param>
    /// <param name="interval">Timespan interval to round to.</param>
    /// <returns>Rounded datetime</returns>
    RoundDown(interval) {
        if (interval === 0) {
            // divide by zero exception
            return this;
        }

        const amount = this.getTime() % interval;
        if (amount > 0) {
            // TODO side-effect or return new IDate object from here?
            //dateTime.setTime(this.getTime() - amount);
            return new IDate(this.getTime() - amount);
        }

        return this;
    };
}
