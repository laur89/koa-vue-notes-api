export default class NotImplementedException extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
