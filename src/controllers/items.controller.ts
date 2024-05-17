import { Request, Response, NextFunction } from "express";
import { ApiError, ApiResponse } from "../utils/responses/responses.ts";
import { db } from "../utils/db.ts";
import { Item, MediaType } from "@prisma/client";
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

		const { name, media, isPrivate }: Item = req.body;

		if (!name || !media) {
			throw new ApiError(400, "Required fields are missing");
		}

		if (folderId) {
			const existingFolder = await db.item.findFirst({
				where: {
					id: folderId,
					ownerId: req.userId,
					isFolder: true,
					isTrash: false,
				},
				select: {
					id: true,
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const previewUrl = crypto.randomBytes(12).toString("hex");

			await db.item.create({
				data: {
					name,
					media,
					previewUrl,
					owner: { connect: { id: req.userId } },
					parent: { connect: { id: existingFolder.id } },
					isPrivate: isPrivate ? isPrivate : false,
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
				isPrivate: isPrivate ? isPrivate : false,
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
					isTrash: false,
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const items = await db.item.findMany({
				where: {
					ownerId: req.userId,
					parentId: existingFolder.id,
					isTrash: false,
				},
				include: {
					_count: {
						select: { childrens: true },
					},
				},
			});

			return ApiResponse(res, 200, { items });
		}

		const items = await db.item.findMany({
			where: { ownerId: req.userId, parent: null, isTrash: false },
			include: {
				_count: {
					select: { childrens: true },
				},
			},
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

		const { name, isPrivate }: Item = req.body;

		if (!name) {
			throw new ApiError(400, "Required fields are missing");
		}

		if (folderId) {
			const existingFolder = await db.item.findFirst({
				where: {
					id: folderId,
					ownerId: req.userId,
					isFolder: true,
					isTrash: false,
				},
				select: {
					id: true,
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const previewUrl = crypto.randomBytes(12).toString("hex");

			await db.item.create({
				data: {
					name,
					previewUrl,
					isFolder: true,
					owner: { connect: { id: req.userId } },
					parent: { connect: { id: existingFolder.id } },
					isPrivate: isPrivate ? isPrivate : false,
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
				isPrivate: isPrivate ? isPrivate : false,
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

export async function getItemsByQuery(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		let items: any = [];

		const { type, mediaType, starred, shared, trash } = req.query;

		if (
			type &&
			type === "true" &&
			mediaType &&
			typeof mediaType === "string"
		) {
			items = await db.item.findMany({
				where: {
					ownerId: req.userId,
					mediaType:
						mediaType === "PDF"
							? MediaType.PDF
							: mediaType === "IMAGE"
							? MediaType.IMAGE
							: mediaType === "VIDEO"
							? MediaType.VIDEO
							: null,
					isFolder: false,
					isTrash: false,
				},
			});
		}

		if (starred && starred === "true") {
			items = await db.item.findMany({
				where: {
					ownerId: req.userId,
					starredByUsers: { has: req.userId },
					isFolder: false,
					isTrash: false,
				},
			});
		}

		if (shared && shared === "true") {
			items = await db.item.findMany({
				where: {
					sharedWithUsers: { has: req.userId },
					isPrivate: true,
					isTrash: true,
				},
			});
		}

		if (trash && trash === "true") {
			items = await db.item.findMany({
				where: {
					ownerId: req.userId,
					isTrash: true,
				},
			});
		}

		ApiResponse(res, 200, { items });
	} catch (error) {
		next(error);
	}
}

export async function getSharedItems(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const items = await db.item.findMany({
			where: { sharedWithUsers: { has: req.userId }, isPrivate: true },
			include: {
				owner: {
					select: {
						email: true,
						name: true,
						image: true,
					},
				},
			},
		});

		ApiResponse(res, 200, { items });
	} catch (error) {
		next(error);
	}
}

export async function shareItem(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const { userIds }: { userIds: string[] } = req.body;

		if (!userIds || userIds.length === 0) {
			throw new ApiError(400, "Required field is missing");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findUnique({
			where: {
				id: itemId,
				isTrash: false,
				ownerId: req.userId,
				isPrivate: true,
			},
			select: {
				id: true,
				sharedWithUsers: true,
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		await db.item.update({
			where: { id: item.id },
			data: {
				sharedWithUsers: { set: [...item.sharedWithUsers, ...userIds] },
			},
		});

		ApiResponse(res, 200, { message: "Item is shared" });
	} catch (error) {
		next(error);
	}
}

export async function removePermission(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const { userIds }: { userIds: string[] } = req.body;

		if (!userIds || userIds.length === 0) {
			throw new ApiError(400, "Required field is missing");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findUnique({
			where: {
				id: itemId,
				isTrash: false,
				ownerId: req.userId,
				isPrivate: true,
				sharedWithUsers: { hasSome: userIds },
			},
			select: {
				id: true,
				sharedWithUsers: true,
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		let filteredIds = [...item.sharedWithUsers];

		userIds.forEach((id) => {
			filteredIds = filteredIds.filter((uId) => uId !== id);
		});

		await db.item.update({
			where: { id: item.id },
			data: {
				sharedWithUsers: { set: [...filteredIds] },
			},
		});

		ApiResponse(res, 200, { message: "Item permission removed" });
	} catch (error) {
		next(error);
	}
}

export async function makeTrash(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findUnique({
			where: { id: itemId, isTrash: false, ownerId: req.userId },
			select: {
				id: true,
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		await db.item.update({
			where: { id: item.id },
			data: {
				isTrash: true,
			},
		});

		await db.item.updateMany({
			where: { parentId: item.id, isTrash: false },
			data: {
				isTrash: true,
			},
		});

		ApiResponse(res, 200, { message: "File sent to trash" });
	} catch (error) {
		next(error);
	}
}

export async function restoreItem(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findUnique({
			where: { id: itemId, isTrash: true, ownerId: req.userId },
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		await db.item.update({
			where: {
				id: item.id,
			},
			data: {
				isTrash: false,
			},
		});

		await db.item.updateMany({
			where: { parentId: item.id, isTrash: true },
			data: {
				isTrash: false,
			},
		});

		ApiResponse(res, 200, { message: "Items restored" });
	} catch (error) {
		next(error);
	}
}

export async function deleteItem(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findUnique({
			where: { id: itemId, isTrash: true, ownerId: req.userId },
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		await db.item.deleteMany({
			where: { parentId: item.id, isTrash: true },
		});

		await db.item.delete({
			where: { id: item.id },
		});

		ApiResponse(res, 200, { message: "File is deleted" });
	} catch (error) {
		next(error);
	}
}
