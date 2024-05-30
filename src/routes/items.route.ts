import { Router } from "express";
import { verifyJWT } from "../middleware/verify-jwt.ts";
import {
	createFile,
	createFolder,
	deleteItem,
	getFileInfo,
	getItems,
	getItemsByQuery,
	makeTrash,
	manageStarredItems,
	restoreItem,
	shareItem,
} from "../controllers/items.controller.ts";

const router = Router();

router.use(verifyJWT);

router.get("/items", getItemsByQuery);
router.get("/items/files-folders/*", getItems);
router.get("/items/:fileId/files", getFileInfo);
router.put("/items/:itemId/files", manageStarredItems);
router.post("/items/files/*", createFile);
router.post("/items/folders/*", createFolder);
router.put("/items/:itemId/share", shareItem);
router.put("/items/:itemId/trash", makeTrash);
router.put("/items/:itemId/restore", restoreItem);
router.delete("/items/:itemId", deleteItem);

export default router;
