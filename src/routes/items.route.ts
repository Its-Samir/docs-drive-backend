import { Router } from "express";
import { verifyJWT } from "../middleware/verify-jwt.ts";
import {
	createFile,
	createFolder,
	deleteItem,
	getItems,
	getItemsByType,
	makeTrash,
	shareItem,
} from "../controllers/items.controller.ts";

const router = Router();

router.use(verifyJWT);

router.get("/items/*", getItems);
router.get("/files", getItemsByType);
router.post("/files/*", createFile);
router.post("/folders/*", createFolder);
router.put("/items/:itemId", shareItem);
router.patch("/items/:itemId", makeTrash);
router.delete("/items/:itemId", deleteItem);

export default router;
