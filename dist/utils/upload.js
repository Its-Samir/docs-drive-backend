"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.bucket = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const storage_1 = require("firebase-admin/storage");
const uuid_1 = require("uuid");
const fs_1 = require("fs");
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert({
        clientEmail: process.env.CLIENT_EMAIL,
        privateKey: process.env.PRIVATE_KEY,
        projectId: process.env.PROJECT_ID,
    }),
    storageBucket: process.env.STORAGE_BUCKET,
});
exports.bucket = firebase_admin_1.default.storage().bucket();
const upload = async (path, filename) => {
    const url = await exports.bucket.upload(path, {
        destination: "drive/" + filename,
        public: true,
        metadata: {
            metadata: {
                firebaseStorageDownloadTokens: (0, uuid_1.v4)(),
            },
        },
    });
    const storageRef = (0, storage_1.getStorage)().bucket(exports.bucket.name);
    const file = storageRef.file(url[0].metadata.name);
    const imageUrl = await (0, storage_1.getDownloadURL)(file);
    (0, fs_1.unlinkSync)(path);
    return imageUrl;
};
exports.upload = upload;
