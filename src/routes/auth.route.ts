import { Router } from "express";
import passport from "passport";
import {
	login,
	logout,
	passportAuth,
	register,
} from "../controllers/auth.controller.ts";
import "../utils/passport-auth.ts";

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

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;
