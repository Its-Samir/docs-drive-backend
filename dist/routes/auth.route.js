"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_controller_1 = require("../controllers/auth.controller");
require("../utils/passport-auth");
const verify_jwt_1 = require("../middleware/verify-jwt");
const router = (0, express_1.Router)();
router.get("/auth/google", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", passport_1.default.authenticate("google"), auth_controller_1.passportAuth);
router.get("/account", verify_jwt_1.verifyJWT, auth_controller_1.getAccountData);
router.get("/users", verify_jwt_1.verifyJWT, auth_controller_1.getUsers);
router.post("/register", auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.post("/logout", verify_jwt_1.verifyJWT, auth_controller_1.logout);
exports.default = router;
