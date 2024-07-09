"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const db_1 = require("./db");
const responses_1 = require("./responses");
const passport_google_oauth20_1 = require("passport-google-oauth20");
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await db_1.db.user.findUnique({ where: { id } });
        if (!user) {
            done(new responses_1.ApiError(404, "User not found"));
        }
        else {
            done(null, user);
        }
    }
    catch (error) {
        done(new responses_1.ApiError(500, "User deserialization failed"));
    }
});
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (_, __, profile, cb) => {
    try {
        const user = await db_1.db.user.findFirst({
            where: { oauthId: profile.id },
        });
        if (user) {
            cb(null, user);
        }
        else {
            const newUser = await db_1.db.user.create({
                data: {
                    name: profile._json.name ||
                        profile._json.email.split("@")[0],
                    email: profile._json.email,
                    oauthId: profile.id,
                    image: profile._json.picture,
                },
            });
            cb(null, newUser);
        }
    }
    catch (error) {
        cb(new responses_1.ApiError(500, "Oauth strategy failed"));
    }
}));
