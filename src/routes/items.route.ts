import { Router } from "express";
import { verifyJWT } from "../middleware/verify-jwt.ts";
import { createFile, createFolder, getItems } from "../controllers/items.controller.ts";

const router = Router();

router.get("/items/*", verifyJWT, getItems);
router.post("/files/*", verifyJWT, createFile);
router.post("/folders/*", verifyJWT, createFolder);

export default router;
