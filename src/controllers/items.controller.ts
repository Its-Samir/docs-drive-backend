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

		const { name, media, isPrivate, mediaType }: Item = req.body;

		if (!name || !media || !mediaType) {
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
					mediaType:
						mediaType === "PDF"
							? MediaType.PDF
							: mediaType === "IMAGE"
							? MediaType.IMAGE
							: mediaType === "VIDEO"
							? MediaType.VIDEO
							: mediaType === "OFFICE"
							? MediaType.OFFICE
							: MediaType.UNKNOWN,
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
				mediaType:
					mediaType === "PDF"
						? MediaType.PDF
						: mediaType === "IMAGE"
						? MediaType.IMAGE
						: mediaType === "VIDEO"
						? MediaType.VIDEO
						: mediaType === "OFFICE"
						? MediaType.OFFICE
						: MediaType.UNKNOWN,
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

export async function getFileInfo(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const fileId = req.params.fileId;

		if (!fileId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findFirst({
			where: {
				id: fileId,
				ownerId: req.userId,
				isTrash: false,
				isFolder: false,
			},
			include: {
				sharedWith: {
					include: {
						user: true,
					},
				},
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		return ApiResponse(res, 200, { item });
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
					owner: {
						select: {
							email: true,
							name: true,
							image: true,
						},
					},
					_count: {
						select: { childrens: true },
					},
				},
				orderBy: {
					isFolder: "desc",
				},
			});

			return ApiResponse(res, 200, { items });
		}

		const items = await db.item.findMany({
			where: { ownerId: req.userId, parent: null, isTrash: false },
			include: {
				owner: {
					select: {
						email: true,
						name: true,
						image: true,
					},
				},
				_count: {
					select: { childrens: true },
				},
			},
			orderBy: {
				isFolder: "desc",
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

		const { type, mediaType, starred, shared, isPrivate, trashed } =
			req.query;

		if (type === "true" && mediaType) {
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
		}

		if (starred === "true") {
			items = await db.item.findMany({
				where: {
					ownerId: req.userId,
					isStarred: true,
					isFolder: false,
					isTrash: false,
				},
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
		}

		if (shared === "true") {
			items = await db.item.findMany({
				where: {
					sharedWith: { some: { userId: req.userId } },
					isPrivate: true,
					isTrash: true,
				},
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
		}

		if (isPrivate === "true") {
			items = await db.item.findMany({
				where: {
					ownerId: req.userId,
					isPrivate: true,
				},
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
		}

		if (trashed === "true") {
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

export async function manageStarredItems(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized");
		}

		const { itemId } = req.params;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findUnique({
			where: {
				id: itemId,
				ownerId: req.userId,
			},
			select: {
				id: true,
				isStarred: true,
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		if (!item.isStarred) {
			await db.item.update({
				where: {
					id: item.id,
				},
				data: {
					isStarred: true,
				},
			});

			return ApiResponse(res, 200, "File Starred");
		}

		await db.item.update({
			where: {
				id: item.id,
			},
			data: {
				isStarred: false,
			},
		});

		ApiResponse(res, 200, "File Unstarred");
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

		const { userId }: { userId: string } = req.body;

		if (!userId) {
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
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		const sharedItem = await db.sharedItem.findFirst({
			where: {
				ownerId: req.userId,
				userId: userId,
				itemId: item.id,
			},
			select: { id: true },
		});

		if (!sharedItem) {
			await db.sharedItem.create({
				data: {
					ownerId: req.userId,
					user: { connect: { id: userId } },
					item: { connect: { id: item.id } },
				},
				select: { id: true },
			});

			return ApiResponse(res, 200, { message: "Item is shared" });
		}

		await db.sharedItem.delete({
			where: {
				id: sharedItem.id,
				ownerId: req.userId,
				userId: userId,
				itemId: item.id,
			},
		});

		ApiResponse(res, 200, { message: "Item is unshared" });
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

		await db.$transaction([
			db.item.update({
				where: { id: item.id },
				data: {
					isTrash: true,
				},
			}),

			db.item.updateMany({
				where: { parentId: item.id, isTrash: false },
				data: {
					isTrash: true,
				},
			}),
		]);

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
			select: {
				id: true,
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		await db.$transaction([
			db.item.update({
				where: {
					id: item.id,
				},
				data: {
					isTrash: false,
				},
			}),

			db.item.updateMany({
				where: { parentId: item.id, isTrash: true },
				data: {
					isTrash: false,
				},
			}),
		]);

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
			select: {
				id: true,
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		await db.$transaction([
			db.item.deleteMany({
				where: { parentId: item.id, isTrash: true },
			}),

			db.item.delete({
				where: { id: item.id },
			}),
		]);

		ApiResponse(res, 200, { message: "File is deleted" });
	} catch (error) {
		next(error);
	}
}
