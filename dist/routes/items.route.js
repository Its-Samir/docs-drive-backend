"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verify_jwt_1 = require("../middleware/verify-jwt");
const items_controller_1 = require("../controllers/items.controller");
const multer_1 = __importDefault(require("multer"));
const multer_upload_js_1 = require("../utils/multer-upload.js");
const router = (0, express_1.Router)();
router.use(verify_jwt_1.verifyJWT);
router.get("/items", items_controller_1.getItemsByQuery);
router.get("/items/count", items_controller_1.getItemsCount);
router.get("/items/files-folders/*", items_controller_1.getItems);
router.get("/items/shared/*", items_controller_1.getSharedItems);
router.get("/items/:itemId", items_controller_1.getItemInfo);
router.post("/items/files/*", (0, multer_1.default)({ storage: multer_upload_js_1.storage }).single("file"), items_controller_1.createFile);
router.post("/items/folders/*", items_controller_1.createFolder);
router.put("/items/:itemId", items_controller_1.editItem);
router.put("/items/:itemId/starred", items_controller_1.manageStarredItems);
router.put("/items/:itemId/share", items_controller_1.shareItem);
router.put("/items/:itemId/trash", items_controller_1.makeTrash);
router.put("/items/:itemId/restore", items_controller_1.restoreItem);
router.delete("/items/:itemId", items_controller_1.deleteItem);
exports.default = router;
