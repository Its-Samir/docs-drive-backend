import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/responses/responses.ts";
import jwt from "jsonwebtoken";

declare global {
	namespace Express {
		interface Request {
			userId?: string;
		}
	}
}

export async function verifyJWT(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const token = req.cookies.token;

		if (!token || typeof token !== "string") {
			return next(new ApiError(401, "Unauthorized"));
		}

		const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET!);

		if (!decodedToken) {
			return next(new ApiError(403, "Token not valid"));
		}

		req.userId = decodedToken.userId;

		next();

	} catch (error) {
		next(new ApiError(500, "JWT verification failed: " + error));
	}
}
