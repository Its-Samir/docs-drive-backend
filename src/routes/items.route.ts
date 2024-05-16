import { Router } from "express";
import { verifyJWT } from "../middleware/verify-jwt.ts";
import {
	createFile,
	createFolder,
	deleteItem,
	getItems,
	getItemsByType,
	getSharedItems,
	makeTrash,
	removePermission,
	restoreItem,
	shareItem,
} from "../controllers/items.controller.ts";

const router = Router();

router.use(verifyJWT);

router.get("/items/files-folders/*", getItems);
router.get("/items/files", getItemsByType);
router.get("/items/shared", getSharedItems);
router.post("/items/files/*", createFile);
router.post("/items/folders/*", createFolder);
router.put("/items/:itemId/share", shareItem);
router.put("/items/:itemId/permission", removePermission);
router.put("/items/:itemId/trash", makeTrash);
router.put("/items/:itemId/restore", restoreItem);
router.delete("/items/:itemId", deleteItem);

export default router;
