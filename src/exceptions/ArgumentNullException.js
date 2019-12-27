export default class ArgumentNullException extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}