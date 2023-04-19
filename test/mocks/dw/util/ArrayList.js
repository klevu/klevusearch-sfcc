'use strict';

class ArrayList {
    constructor(values) {
        if (values.length === 0) {
            this.values = [];
        } else if (values.length === 1 && Array.isArray(values[0])) {
            this.values = [...values[0]];
        } else {
            this.values = [...values];
        }
        Object.seal(this);
    }

    add(...objects) {
        const len = this.values.length;
        if (objects.length === 1 && Array.isArray(objects[0])) {
            this.values.push(...objects[0]);
        } else {
            this.values.push(...objects);
        }
        return len !== this.values.length;
    }

    push(...objects) {
        this.values.push(...objects);
        return this.values.length;
    }

    add1(object) {
        this.values.push(object);
        return true;
    }

    get empty() {
        return this.values.length === 0;
    }

    get length() {
        return this.values.length;
    }

    contains(object) {
        return this.values.includes(object);
    }

    forEach(fn, ctx) {
        return this.values.forEach(fn, ctx || this);
    }

    reduce(fn, init) {
        return this.values.reduce(fn.bind(this), init);
    }

    reverse() {
        this.values.reverse();
    }

    sort() {
        this.values.sort();
    }

    get(i) {
        return this.values[i];
    }

    set(i, value) {
        if (i < 0 || i >= this.values.length) {
            throw new RangeError();
        }
        let oldValue = this.values[i];
        this.values[i] = value;
        return oldValue;
    }

    getLength() {
        return this.values.length;
    }

    isEmpty() {
        return this.values.length === 0;
    }

    toArray() {
        return this.values;
    }
}

module.exports = ArrayList;
