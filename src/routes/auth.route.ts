import { Router } from "express";
import passport from "passport";
import {
	getAccountData,
	getUsers,
	login,
	logout,
	passportAuth,
	register,
} from "../controllers/auth.controller";
import "../utils/passport-auth";
import { verifyJWT } from "../middlewares/verify-jwt";

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

router.get("/account", verifyJWT, getAccountData);
router.get("/users", verifyJWT, getUsers);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyJWT, logout);

export default router;
