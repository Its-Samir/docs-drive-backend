import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/responses";
import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "../utils/db";

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
		const token = req.headers["authorization"]?.replace("Bearer ", "") || req.cookies["access_token"];

		if (!token || typeof token !== "string") {
			throw new ApiError(401, "Unauthorized request");
		}

		const decodedToken = jwt.verify(
			token,
			process.env.JWT_SECRET!
		) as DecodedToken;

		if (!decodedToken || !decodedToken.userId) {
			throw new ApiError(403, "Token not valid");
		}

		const user = await db.user.findUnique({
			where: { id: decodedToken.userId },
			select: {
				id: true,
			},
		});

		if (!user) {
			throw new ApiError(401, "No user found");
		}

		req.userId = user.id;

		next();
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			return next(new ApiError(401, "Couldn't parse the token"));
		}

		if (error instanceof jwt.TokenExpiredError) {
			return next(new ApiError(401, "Token is expired"));
		}

		next(error);
	}
}
