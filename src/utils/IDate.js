export default class IDate extends Date {
    constructor() {
        super();
    }

    addMillis(ms) {
        this.setTime(this.getTime() + ms);
        return this;
    }

    Add(ms) {
        //  TODO: side-effect or return new object?
        return this.addMillis(ms);
    }
}
