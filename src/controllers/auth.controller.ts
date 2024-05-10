import { NextFunction, Request, Response } from "express";
import { db } from "../utils/db.ts";
import { ApiError } from "../utils/responses/responses.ts";
import jwt from "jsonwebtoken";

export async function passportAuth(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const user = await db.user.findUnique({
			where: { id: req.user?.id },
			select: {
				id: true,
				email: true,
				image: true,
				name: true,
			},
		});

		if (!user) {
			return next(new ApiError(404, "User not found"));
		}

		const token = jwt.sign(
			{
				userId: user.id,
			},
			process.env.JWT_SECRET!,
			{ expiresIn: "1h" }
		);

		res.cookie("token", token, { httpOnly: true, maxAge: 3600000 })
			.status(200)
			.json({ token, user });

	} catch (error) {
		next(error);
	}
}
