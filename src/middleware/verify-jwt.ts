import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/responses.ts";
import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "../utils/db.ts";

declare global {
	namespace Express {
		interface Request {
			userId?: string;
		}
	}
}

interface DecodedToken extends JwtPayload {
	userId: string;
}

export async function verifyJWT(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const token = req.headers["authorization"] || req.cookies["token"];

		if (!token || typeof token !== "string") {
			return next(new ApiError(401, "Unauthorized"));
		}

		const decodedToken = jwt.verify(
			token,
			process.env.JWT_SECRET!
		) as DecodedToken;

		if (!decodedToken || !decodedToken.userId) {
			return next(new ApiError(403, "Token not valid"));
		}

		const user = await db.user.findUnique({
			where: { id: decodedToken.userId },
			select: {
				id: true,
			},
		});

		if (!user) {
			return next(new ApiError(401, "Unauthorized"));
		}

		req.userId = user.id;

		next();
	} catch (error) {
		next(new ApiError(500, "JWT verification failed: " + error));
	}
}
