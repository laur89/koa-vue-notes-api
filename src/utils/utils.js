/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRand(min, max) {
    return Math.random() * (max - min) + min;
}

// Get the Object's methods names:
const getMethodsNames = function(obj = this) {
    return Object.keys(obj).filter(key => typeof obj[key] === 'function');
};

export { getRand, getRandInt, getMethodsNames };
