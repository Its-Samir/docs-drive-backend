import express, { Express, Request, Response, NextFunction } from "express";
import { ExtendedError } from "./types/index.ts";
import { ApiError, ApiResponse } from "./utils/responses/responses.ts";

const app: Express = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res, next) => {
   next(new ApiError(200, "Error"));
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
