"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const responses_1 = require("./utils/responses");
const express_session_1 = __importDefault(require("express-session"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const items_route_1 = __importDefault(require("./routes/items.route"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_APP_URL,
    credentials: true,
}));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
}));
app.use("/api", auth_route_1.default);
app.use("/api", items_route_1.default);
app.get("/", (req, res, next) => {
    (0, responses_1.ApiResponse)(res, 200, { message: "Hello" });
});
app.use((err, req, res, next) => {
    const errorMessage = err.message ? err.message : "Internal Server Error";
    res.status(err.statusCode || 500).json({ error: errorMessage });
});
app.listen(5000, () => {
    console.log("Running...");
});
