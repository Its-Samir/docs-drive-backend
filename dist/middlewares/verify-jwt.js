"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = void 0;
const responses_1 = require("../utils/responses");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../utils/db");
async function verifyJWT(req, res, next) {
    try {
        const token = req.headers["authorization"]?.replace("Bearer ", "") || req.cookies["access_token"];
        if (!token || typeof token !== "string") {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decodedToken || !decodedToken.userId) {
            throw new responses_1.ApiError(403, "Token not valid");
        }
        const user = await db_1.db.user.findUnique({
            where: { id: decodedToken.userId },
            select: {
                id: true,
            },
        });
        if (!user) {
            throw new responses_1.ApiError(401, "No user found");
        }
        req.userId = user.id;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next(new responses_1.ApiError(401, "Couldn't parse the token"));
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new responses_1.ApiError(401, "Token is expired"));
        }
        next(error);
    }
}
exports.verifyJWT = verifyJWT;
