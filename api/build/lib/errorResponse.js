"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = errorResponse;
function errorResponse(res, msg, error, code = 500) {
    console.error(msg, error);
    return res.status(code).json({
        error: msg,
        details: error instanceof Error ? error.message : undefined,
    });
}
