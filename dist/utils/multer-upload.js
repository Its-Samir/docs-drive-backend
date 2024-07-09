"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(require.main?.path);
const __dirname = path_1.default.dirname(__filename);
exports.storage = multer_1.default.diskStorage({
    destination(_, __, callback) {
        callback(null, path_1.default.join(__dirname, "./public/temp"));
    },
    filename(_, file, callback) {
        callback(null, crypto.randomUUID().slice(0, 5) +
            "-" +
            file.originalname.split(" ").join("-"));
    },
});
