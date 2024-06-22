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
	getItemsCount,
	getSharedItems,
	makeTrash,
	manageStarredItems,
	restoreItem,
	shareItem,
} from "../controllers/items.controller.ts";

const router = Router();

router.use(verifyJWT);

router.get("/items", getItemsByQuery);
router.get("/items/count", getItemsCount);
router.get("/items/files-folders/*", getItems);
router.get("/items/shared/*", getSharedItems);
router.get("/items/:itemId", getItemInfo);
router.post("/items/files/*", createFile);
router.post("/items/folders/*", createFolder);
router.put("/items/:itemId", editItem);
router.put("/items/:itemId/starred", manageStarredItems);
router.put("/items/:itemId/share", shareItem);
router.put("/items/:itemId/trash", makeTrash);
router.put("/items/:itemId/restore", restoreItem);
router.delete("/items/:itemId", deleteItem);

export default router;
