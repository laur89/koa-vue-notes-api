// based on LEAN's Common/Data/Consolidators/QuoteBarConsolidator.cs
import PeriodCountConsolidatorBase from './PeriodCountConsolidatorBase.js';
import QuoteBar from '../model/QuoteBar.js';
import Bar from "../model/Bar";
import {MarketDataType} from "../constants/Global";

export default class QuoteBarConsolidator extends PeriodCountConsolidatorBase {
    constructor(timeSpan) {
        super(timeSpan);
    }

    /// <summary>
    /// Aggregates the new 'data' into the 'workingBar'. The 'workingBar' will be
    /// null following the event firing
    /// </summary>
    /// <param name="workingBar">The bar we're building, null if the event was just fired and we're starting a new consolidated bar</param>
    /// <param name="data">The new data</param>
    /// <returns>workingBar after aggregation. Note this differs from C# - there we pass bar as a ref!</returns>
    AggregateBar(workingBar, data) {
        let bid = data.Bid;
        let ask = data.Ask;

        if (workingBar === null) {
            workingBar = new QuoteBar();
            workingBar.Symbol = data.Symbol;
            workingBar.Time = this.GetRoundedBarTime(data.Time);
            workingBar.Bid = bid === null ? null : bid.Clone();
            workingBar.Ask = ask === null ? null : ask.Clone();
            workingBar.Period = this.IsTimeBased() && this._period !== null
                ? this._period
                : data.Period;
        }

        // update the bid and ask
        if (bid !== null) {
            workingBar.LastBidSize = data.LastBidSize;
            if (workingBar.Bid === null) {
                workingBar.Bid = new Bar(
                    bid.Open,
                    bid.High,
                    bid.Low,
                    bid.Close
                );
            } else {
                workingBar.Bid.Close = bid.Close;
                if (workingBar.Bid.High < bid.High)
                    workingBar.Bid.High = bid.High;
                if (workingBar.Bid.Low > bid.Low) workingBar.Bid.Low = bid.Low;
            }
        }

        if (ask !== null) {
            workingBar.LastAskSize = data.LastAskSize;
            if (workingBar.Ask === null) {
                workingBar.Ask = new Bar(
                    ask.Open,
                    ask.High,
                    ask.Low,
                    ask.Close
                );
            } else {
                workingBar.Ask.Close = ask.Close;
                if (workingBar.Ask.High < ask.High)
                    workingBar.Ask.High = ask.High;
                if (workingBar.Ask.Low > ask.Low) workingBar.Ask.Low = ask.Low;
            }
        }

        workingBar.Value = data.Value;
        if (!this.IsTimeBased()) workingBar.Period += data.Period;

        return workingBar;
    }
}
