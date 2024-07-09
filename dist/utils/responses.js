"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(statuscode, message) {
        super();
        this.message = message;
        this.statusCode = statuscode;
    }
}
exports.ApiError = ApiError;
function ApiResponse(res, statusCode, payload) {
    return res.status(statusCode).json(payload);
}
exports.ApiResponse = ApiResponse;
