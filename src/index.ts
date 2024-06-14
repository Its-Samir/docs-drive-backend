import express, { Express, Request, Response, NextFunction } from "express";
import { ExtendedError } from "./types/index.ts";
import { ApiError, ApiResponse } from "./utils/responses.ts";
import session from "express-session";
import authRouter from "./routes/auth.route.ts";
import itemRouter from "./routes/items.route.ts";
import cookieParser from "cookie-parser";
import cors from "cors";

const app: Express = express();

app.use(
	cors({
		origin: "http://localhost:5173",
	})
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
	session({
		secret: process.env.SESSION_SECRET!,
		saveUninitialized: false,
		resave: false,
	})
);

app.use("/api", authRouter);
app.use("/api", itemRouter);

app.get("/", (req, res, next) => {
	ApiResponse(res, 200, { message: "Hello" });
});

app.use(
	(err: ExtendedError, req: Request, res: Response, next: NextFunction) => {
		const errorMessage = err.message ? err.message : "Internal Server Error";
		res.status(err.statusCode || 500).json({ error: errorMessage });
	}
);

app.listen(5000, () => {
	console.log("Running...");
});
