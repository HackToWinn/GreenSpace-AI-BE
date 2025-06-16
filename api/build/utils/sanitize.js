"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitize = sanitize;
function sanitize(obj) {
    return JSON.parse(JSON.stringify(obj, (_, value) => typeof value === 'bigint' ? value.toString() : value));
}
