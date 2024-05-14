import { Request, Response, NextFunction } from "express";
import { ApiError, ApiResponse } from "../utils/responses/responses.ts";
import { db } from "../utils/db.ts";
import { Item } from "@prisma/client";
import crypto from "crypto";

export async function createFile(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const params = req.params[0].split("/");

		const folderId = params[params.length - 1];

		const { name, media }: Item = req.body;

		if (!name || !media) {
			throw new ApiError(400, "Required fields are missing");
		}

		if (folderId) {
			const existingFolder = await db.item.findFirst({
				where: {
					id: folderId,
					ownerId: req.userId,
					isFolder: true,
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const previewUrl = crypto.randomBytes(12).toString("hex");

			const file = await db.item.create({
				data: {
					name,
					media,
					previewUrl,
					owner: { connect: { id: req.userId } },
					parent: { connect: { id: existingFolder.id } },
				},
			});

			return ApiResponse(res, 201, { message: "File created" });
		}

		const previewUrl = crypto.randomBytes(12).toString("hex");

		const file = await db.item.create({
			data: {
				name,
				media,
				previewUrl,
				owner: { connect: { id: req.userId } },
			},
		});

		await db.user.update({
			where: { id: req.userId },
			data: {
				items: { connect: { id: file.id } },
			},
		});

		ApiResponse(res, 201, { message: "File created" });
	} catch (error) {
		next(error);
	}
}

export async function getItems(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const params = req.params[0].split("/");

		const folderId = params[params.length - 1];

		if (folderId) {
			const existingFolder = await db.item.findFirst({
				where: {
					id: folderId,
					ownerId: req.userId,
					isFolder: true,
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const items = await db.item.findMany({
				where: { ownerId: req.userId, parentId: existingFolder.id },
				include: { childrens: true },
			});

			return ApiResponse(res, 200, { items });
		}

		const items = await db.item.findMany({
			where: { ownerId: req.userId, parent: null },
			include: { childrens: true },
		});

		ApiResponse(res, 200, { items });
	} catch (error) {
		next(error);
	}
}

export async function createFolder(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const params = req.params[0].split("/");

		const folderId = params[params.length - 1];

		const { name }: Item = req.body;

		if (!name) {
			throw new ApiError(400, "Required fields are missing");
		}

		if (folderId) {
			const existingFolder = await db.item.findFirst({
				where: {
					id: folderId,
					ownerId: req.userId,
					isFolder: true,
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const previewUrl = crypto.randomBytes(12).toString("hex");

			const folder = await db.item.create({
				data: {
					name,
					previewUrl,
					isFolder: true,
					owner: { connect: { id: req.userId } },
					parent: { connect: { id: existingFolder.id } },
				},
			});

			return ApiResponse(res, 201, { message: "Folder created" });
		}

		const previewUrl = crypto.randomBytes(12).toString("hex");

		const folder = await db.item.create({
			data: {
				name,
				previewUrl,
				isFolder: true,
				owner: { connect: { id: req.userId } },
			},
		});

		await db.user.update({
			where: { id: req.userId },
			data: {
				items: { connect: { id: folder.id } },
			},
		});

		ApiResponse(res, 201, { message: "Folder created" });
	} catch (error) {
		next(error);
	}
}
