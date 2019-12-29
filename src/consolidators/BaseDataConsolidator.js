// based on LEAN's Common/Data/Consolidators/PeriodCountConsolidatorBase.cs
import PeriodCountConsolidatorBase from './PeriodCountConsolidatorBase.js';
import TradeBar from '../model/TradeBar.js';
import QuoteBar from "../model/QuoteBar";

/// <summary>
/// Type capable of consolidating trade bars from any base data instance
/// </summary>
//export default class BaseDataConsolidator /*extends TradeBarConsolidatorBase*/ {  // note in C#/LEAN we extand from TBConsolidatorBase, but it doesn't appear to add much; that's why we shortcut to extending from PeriodCountConsolidatorBase
export default class BaseDataConsolidator extends PeriodCountConsolidatorBase {
    constructor(timeSpan) {
        super(timeSpan);
    }

    /// <summary>
    /// Aggregates the new 'data' into the 'workingBar'. The 'workingBar' will be
    /// null following the event firing
    /// </summary>
    /// <param name="workingBar">The bar we're building, null if the event was just fired and we're starting a new trade bar</param>
    /// <param name="data">The new data</param>
    AggregateBar(workingBar, data) {
        if (workingBar === null) {
            workingBar = new TradeBar();

            workingBar.Symbol = data.Symbol;
            workingBar.Time = this.GetRoundedBarTime(data.Time);
            workingBar.Close = data.Value;
            workingBar.High = data.Value;
            workingBar.Low = data.Value;
            workingBar.Open = data.Value;
            workingBar.DataType = data.DataType;
            workingBar.Value = data.Value;
        } else {
            //Aggregate the working bar
            workingBar.Close = data.Value;
            if (data.Value < workingBar.Low) workingBar.Low = data.Value;
            if (data.Value > workingBar.High) workingBar.High = data.Value;
        }

        return workingBar;
    }
}
