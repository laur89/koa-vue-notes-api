// based on LEAN's Common/Data/Consolidators/TradeBarConsolidator.cs
import PeriodCountConsolidatorBase from './PeriodCountConsolidatorBase.js';
import TradeBar from '../model/TradeBar.js';
import { MarketDataType } from '../constants/Global.js';

/// <summary>
/// Type capable of consolidating trade bars from any base data instance
/// </summary>
//export default class TradeBarConsolidator /*extends TradeBarConsolidatorBase*/ {  // note in C#/LEAN we extand from TBConsolidatorBase, but it doesn't appear to add much; that's why we shortcut to extending from PeriodCountConsolidatorBase
export default class TradeBarConsolidator extends PeriodCountConsolidatorBase {
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

            workingBar.Time = this.GetRoundedBarTime(data.Time);
            workingBar.Symbol = data.Symbol;
            workingBar.Open = data.Open;
            workingBar.High = data.High;
            workingBar.Low = data.Low;
            workingBar.Close = data.Close;
            workingBar.Volume = data.Volume;
            workingBar.DataType = MarketDataType.TradeBar;
            workingBar.Period = this.IsTimeBased() && this.Period !== null ? this.Period : data.Period;
        } else {
            //Aggregate the working bar
            workingBar.Close = data.Close;
            workingBar.Volume += data.Volume;
            if (!this.IsTimeBased()) workingBar.Period += data.Period;
            if (data.Low < workingBar.Low) workingBar.Low = data.Low;
            if (data.High > workingBar.High) workingBar.High = data.High;
        }

        return workingBar;
    }
}
