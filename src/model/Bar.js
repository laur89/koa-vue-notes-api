/// <summary>
/// Base Bar Class: Open, High, Low, Close and Period.
/// </summary>
export default class Bar {
    /// <summary>
    /// Initializer to setup a bar with a given information.
    /// </summary>
    /// <param name="open">Decimal Opening Price</param>
    /// <param name="high">Decimal High Price of this bar</param>
    /// <param name="low">Decimal Low Price of this bar</param>
    /// <param name="close">Decimal Close price of this bar</param>
    constructor(o = 0.0, h = 0.0, l = 0.0, c = 0.0) {
        this.Open = o;
        this.High = h;
        this.Low = l;
        this.Close = c;
    }

    /// <summary>
    /// Updates the bar with a new value. This will aggregate the OHLC bar
    /// </summary>
    /// <param name="value">The new value</param>
    Update(value) {
        // Do not accept zero as a new value
        if (value === 0) return;

        if (this.Open === 0)
            this.Open = this.High = this.Low = this.Close = value;
        if (value > this.High) this.High = value;
        if (value < this.Low) this.Low = value;
        this.Close = value;
    }

    /// <summary>
    /// Returns a clone of this bar
    /// </summary>
    Clone() {
        return new Bar(this.Open, this.High, this.Low, this.Close);
    }
}
