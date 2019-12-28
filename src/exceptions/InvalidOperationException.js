export default class InvalidOperationException extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
