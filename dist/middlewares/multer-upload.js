"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
let tempDirectory;
if (process.env.NODE_ENV === "development") {
    tempDirectory = path_1.default.join(__dirname, "../../temp/");
}
else {
    tempDirectory = "/temp/";
}
exports.storage = multer_1.default.diskStorage({
    destination: (_, __, callback) => {
        callback(null, tempDirectory);
    },
    filename: (_, file, callback) => {
        callback(null, crypto.randomUUID().slice(0, 5) +
            "-" +
            file.originalname.split(" ").join("-"));
    },
});
