import { Router } from "express";
import passport from "passport";
import {
	getUser,
	login,
	logout,
	passportAuth,
	register,
} from "../controllers/auth.controller.ts";
import "../utils/passport-auth.ts";
import { verifyJWT } from "../middleware/verify-jwt.ts";

const router = Router();

router.get(
	"/auth/google",
	passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
	"/auth/google/callback",
	passport.authenticate("google"),
	passportAuth
);

router.get("/users", verifyJWT, getUser);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyJWT, logout);

export default router;
