"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badRequest = badRequest;
function badRequest(res, msg) {
    return res.status(400).json({ error: msg });
}
