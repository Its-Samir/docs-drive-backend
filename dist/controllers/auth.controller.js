"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = exports.logout = exports.login = exports.register = exports.getAccountData = exports.passportAuth = void 0;
const db_1 = require("../utils/db");
const responses_1 = require("../utils/responses");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function passportAuth(req, res, next) {
    try {
        const user = await db_1.db.user.findUnique({
            where: { id: req.user?.id },
            select: {
                id: true,
                email: true,
                image: true,
                name: true,
            },
        });
        if (!user) {
            throw new responses_1.ApiError(404, "User not found");
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
        }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.cookie("access_token", token, {
            httpOnly: true,
            sameSite: "none",
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000,
        })
            .status(200)
            .redirect(`${process.env.CLIENT_APP_AUTHENTICATE_URL}?credentials=true&oauth=true&auth_token=${token}`);
    }
    catch (error) {
        next(error);
    }
}
exports.passportAuth = passportAuth;
async function getAccountData(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const user = await db_1.db.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                image: true,
                name: true,
            },
        });
        if (!user) {
            throw new responses_1.ApiError(404, "User not found");
        }
        const token = req.cookies["access_token"];
        res.status(200).json({ token, user, loginTime: new Date() });
    }
    catch (error) {
        next(error);
    }
}
exports.getAccountData = getAccountData;
async function register(req, res, next) {
    try {
        const { name, email, password } = req.body;
        if (!email || !name || !password) {
            throw new responses_1.ApiError(400, "Required fields are missing");
        }
        const invalidEmailInput = email.split("@").length !== 2 ||
            email.split("@")[1].split(".").length !== 2 ||
            email.split("@")[1].split(".")[1] === "";
        if (invalidEmailInput) {
            throw new responses_1.ApiError(400, "Invalid email input");
        }
        const existingUser = await db_1.db.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            throw new responses_1.ApiError(409, "An user already exists with the email");
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        await db_1.db.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
            },
        });
        (0, responses_1.ApiResponse)(res, 201, { message: "User created successfully" });
    }
    catch (error) {
        next(error);
    }
}
exports.register = register;
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new responses_1.ApiError(400, "Required fields are missing");
        }
        const invalidEmailInput = email.split("@").length !== 2 ||
            email.split("@")[1].split(".").length !== 2 ||
            email.split("@")[1].split(".")[1] === "";
        if (invalidEmailInput) {
            throw new responses_1.ApiError(400, "Invalid email input");
        }
        const existingUser = await db_1.db.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                image: true,
                name: true,
                password: true,
            },
        });
        if (!existingUser) {
            throw new responses_1.ApiError(404, "User not found");
        }
        const isCorrectPassword = await bcryptjs_1.default.compare(password, existingUser.password);
        if (!isCorrectPassword) {
            throw new responses_1.ApiError(403, "Invalid credentials");
        }
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id,
        }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.cookie("access_token", token, {
            httpOnly: true,
            maxAge: 3600000,
            sameSite: "none",
            secure: process.env.NODE_ENV === "production",
        })
            .status(200)
            .json({
            user: {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                image: existingUser.image,
            },
            loginTime: new Date(),
        });
    }
    catch (error) {
        next(error);
    }
}
exports.login = login;
async function logout(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized");
        }
        res.clearCookie("access_token")
            .status(200)
            .json({ message: "User logged out" });
    }
    catch (error) {
        next(error);
    }
}
exports.logout = logout;
async function getUsers(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized");
        }
        const email = req.query.email;
        if (!email || typeof email !== "string") {
            throw new responses_1.ApiError(400, "Invalid query");
        }
        const users = await db_1.db.user.findMany({
            where: { OR: [{ email }, { email: { contains: email } }] },
            select: { id: true, email: true },
        });
        if (!users.length)
            return new responses_1.ApiError(404, "User not found");
        (0, responses_1.ApiResponse)(res, 200, { users });
    }
    catch (error) {
        next(error);
    }
}
exports.getUsers = getUsers;
