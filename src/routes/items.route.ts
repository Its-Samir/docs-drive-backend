import { Router } from "express";
import { verifyJWT } from "../middleware/verify-jwt.ts";
import {
	createFile,
	createFolder,
	deleteItem,
	editItem,
	getItemInfo,
	getItems,
	getItemsByQuery,
	getSharedItems,
	makeTrash,
	manageStarredItems,
	restoreItem,
	shareItem,
} from "../controllers/items.controller.ts";

const router = Router();

router.use(verifyJWT);

router.get("/items", getItemsByQuery);
router.get("/items/files-folders/*", getItems);
router.get("/items/:itemId/files", getItemInfo);
router.get("/items/shared/*", getSharedItems);
router.put("/items/:itemId/starred", manageStarredItems);
router.post("/items/files/*", createFile);
router.post("/items/folders/*", createFolder);
router.put("/items/:itemId", editItem);
router.put("/items/:itemId/share", shareItem);
router.put("/items/:itemId/trash", makeTrash);
router.put("/items/:itemId/restore", restoreItem);
router.delete("/items/:itemId", deleteItem);

export default router;
