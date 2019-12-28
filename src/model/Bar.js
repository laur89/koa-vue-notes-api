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
}
