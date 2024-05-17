import { NextFunction, Request, Response } from "express";
import { db } from "../utils/db.ts";
import { ApiError, ApiResponse } from "../utils/responses/responses.ts";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import bcrypt from "bcryptjs";

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
			throw new ApiError(404, "User not found");
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

export async function register(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { name, email, password }: User = req.body;

		if (!email || !name || !password) {
			throw new ApiError(400, "Required fields are missing");
		}

		const invalidEmailInput =
			email.split("@").length !== 2 ||
			email.split("@")[1].split(".").length !== 2 ||
			email.split("@")[1].split(".")[1] === "";

		if (invalidEmailInput) {
			throw new ApiError(400, "Invalid email input");
		}

		const existingUser = await db.user.findUnique({
			where: { email },
			select: { id: true },
		});

		if (existingUser) {
			throw new ApiError(409, "An user already exists with the email");
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		await db.user.create({
			data: {
				email,
				name,
				password: hashedPassword,
			},
		});

		ApiResponse(res, 201, { message: "User created successfully" });
	} catch (error) {
		next(error);
	}
}

export async function login(req: Request, res: Response, next: NextFunction) {
	try {
		const { email, password }: User = req.body;

		if (!email || !password) {
			throw new ApiError(400, "Required fields are missing");
		}

		const invalidEmailInput =
			email.split("@").length !== 2 ||
			email.split("@")[1].split(".").length !== 2 ||
			email.split("@")[1].split(".")[1] === "";

		if (invalidEmailInput) {
			throw new ApiError(400, "Invalid email input");
		}

		const existingUser = await db.user.findUnique({
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
			throw new ApiError(404, "User not found");
		}

		const isCorrectPassword = await bcrypt.compare(
			password,
			existingUser.password as string
		);

		if (!isCorrectPassword) {
			throw new ApiError(403, "Invalid credentials");
		}

		const token = jwt.sign(
			{
				userId: existingUser.id,
			},
			process.env.JWT_SECRET!,
			{ expiresIn: "1h" }
		);

		res.cookie("token", token, { httpOnly: true, maxAge: 3600000 })
			.status(200)
			.json({
				token,
				user: {
					id: existingUser.id,
					email: existingUser.email,
					name: existingUser.name,
					image: existingUser.image,
				},
			});
	} catch (error) {
		next(error);
	}
}
