import { Request, Response, NextFunction } from "express";
import { ApiError, ApiResponse } from "../utils/responses";
import { db } from "../utils/db";
import { Item, MediaType, Prisma } from "@prisma/client";
import crypto from "crypto";
import { bucket, uploadToBucket } from "../utils/upload-file";
import { getStorage } from "firebase-admin/storage";

export async function uploadFile(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized request");
		}

		const params = req.params[0].split("/");

		const folderId = params[params.length - 1];

		const { isPrivate } = req.body;

		if (!req.file) return new ApiError(400, "File is required");

		const size = req.file.size;

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
					size: true,
					isPrivate: true,
					parent: {
						select: { id: true, childrens: true, parent: true },
					},
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const updatedSize = existingFolder.size + size;
			const previewUrl = crypto.randomBytes(12).toString("hex");
			const imageUrl = await uploadToBucket(
				req.file.path,
				req.file.filename
			);

			await db.$transaction([
				db.item.create({
					data: {
						name: req.file.filename,
						media: imageUrl,
						mediaType: req.file.mimetype.startsWith("application/pdf")
							? MediaType.PDF
							: req.file.mimetype.startsWith("image/")
							? MediaType.IMAGE
							: req.file.mimetype.startsWith("video/")
							? MediaType.VIDEO
							: req.file.mimetype.startsWith("application/vnd.")
							? MediaType.OFFICE
							: MediaType.UNKNOWN,
						previewUrl,
						size,
						owner: { connect: { id: req.userId } },
						parent: { connect: { id: existingFolder.id } },
						isPrivate:
							isPrivate === "true" ? true : existingFolder.isPrivate,
					},
				}),

				db.item.update({
					where: { id: existingFolder.id },
					data: {
						size: updatedSize,
					},
				}),
			]);

			let currentParent: typeof existingFolder.parent =
				existingFolder.parent;

			while (currentParent) {
				const updatedSize =
					currentParent.childrens
						.map((i) => i.size)
						.reduce((a, c) => a + c) + size; // adding this size because in prisma transaction the updated size of the existing folder wouldn't affect immediately

				await db.item.update({
					where: {
						id: currentParent.id,
					},
					data: {
						size: updatedSize,
					},
				});

				currentParent =
					currentParent.parent as typeof existingFolder.parent;
			}

			return ApiResponse(res, 201, { message: "File Uploaded" });
		}

		const previewUrl = crypto.randomBytes(12).toString("hex");
		const imageUrl = await uploadToBucket(req.file.path, req.file.filename);

		const file = await db.item.create({
			data: {
				name: req.file.filename,
				media: imageUrl,
				mediaType: req.file.mimetype.startsWith("application/pdf")
					? MediaType.PDF
					: req.file.mimetype.startsWith("image/")
					? MediaType.IMAGE
					: req.file.mimetype.startsWith("video/")
					? MediaType.VIDEO
					: req.file.mimetype.startsWith("application/vnd.")
					? MediaType.OFFICE
					: MediaType.UNKNOWN,
				previewUrl,
				size,
				owner: { connect: { id: req.userId } },
				isPrivate: isPrivate === "true" ? true : false,
			},
		});

		await db.user.update({
			where: { id: req.userId },
			data: {
				items: { connect: { id: file.id } },
			},
		});

		ApiResponse(res, 201, { message: "File Uploaded" });
	} catch (error) {
		next(error);
	}
}

export async function getItemInfo(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized request");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findFirst({
			where: {
				id: itemId,
				ownerId: req.userId,
				isTrash: false,
			},
			include: {
				sharedWith: {
					include: {
						user: {
							select: {
								email: true,
								name: true,
								image: true,
							},
						},
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

export async function getFilePreview(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized request");
		}

		const { previewUrl } = req.params;

		const file = await db.item.findFirst({
			where: {
				previewUrl,
				sharedWith: { some: { userId: req.userId } },
			},
			select: {
				id: true,
				name: true,
				media: true,
			},
		});

		if (!file) {
			throw new ApiError(404, "File not found");
		}

		ApiResponse(res, 200, { file });
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
			throw new ApiError(401, "Unauthorized request");
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

export async function editItem(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized request");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "itemId is missing");
		}

		const { name, isPrivate }: Item = req.body;

		if (!name) {
			throw new ApiError(400, "Required fields are missing");
		}

		const existingItem = await db.item.findFirst({
			where: {
				id: itemId,
				ownerId: req.userId,
			},
			select: {
				id: true,
				name: true,
				isPrivate: true,
			},
		});

		if (!existingItem) {
			throw new ApiError(404, "Item not found");
		}

		if (existingItem.name === name && existingItem.isPrivate === isPrivate) {
			/* prevent unnecessary updates but response is ok as the values are same */
			return ApiResponse(res, 200, { message: "Item is updated" });
		}

		await db.item.update({
			where: { id: existingItem.id },
			data: {
				name,
				isPrivate,
			},
		});

		ApiResponse(res, 200, { message: "Item is updated" });
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
			throw new ApiError(401, "Unauthorized request");
		}

		const params = req.params[0].split("/");

		const folderId = params[params.length - 1];

		const { name, isPrivate, size }: Item = req.body;

		if (!name) {
			throw new ApiError(400, "Required fields are missing");
		}

		const existingItem = await db.item.findFirst({
			where: { name, ownerId: req.userId },
		});

		if (existingItem) throw new ApiError(409, "Folder name already exists");

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
					size: true,
					isPrivate: true,
				},
			});

			if (!existingFolder) {
				throw new ApiError(404, "Folder not found");
			}

			const updatedSize = existingFolder.size + size;
			const previewUrl = crypto.randomBytes(12).toString("hex");

			await db.$transaction([
				db.item.create({
					data: {
						name,
						previewUrl,
						isFolder: true,
						owner: { connect: { id: req.userId } },
						parent: { connect: { id: existingFolder.id } },
						isPrivate: isPrivate ? isPrivate : existingFolder.isPrivate,
						size,
					},
				}),

				db.item.update({
					where: { id: existingFolder.id },
					data: {
						size: updatedSize,
					},
				}),
			]);

			return ApiResponse(res, 201, { message: "Folder Created" });
		}

		const previewUrl = crypto.randomBytes(12).toString("hex");

		const folder = await db.item.create({
			data: {
				name,
				previewUrl,
				isFolder: true,
				owner: { connect: { id: req.userId } },
				isPrivate,
				size,
			},
		});

		await db.user.update({
			where: { id: req.userId },
			data: {
				items: { connect: { id: folder.id } },
			},
		});

		ApiResponse(res, 201, { message: "Folder Created" });
	} catch (error) {
		next(error);
	}
}

export async function getItemsCount(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized request");
		}

		const [folder, file, privates, sharedByUser, sharedWithUser] =
			await db.$transaction([
				db.item.count({ where: { ownerId: req.userId, isFolder: true } }),
				db.item.count({ where: { ownerId: req.userId, isFolder: false } }),
				db.item.count({ where: { ownerId: req.userId, isPrivate: true } }),
				db.sharedItem.count({ where: { ownerId: req.userId } }),
				db.sharedItem.count({ where: { userId: req.userId } }),
			]);

		const data: { name: string; count: number }[] = [];

		Object.keys({
			folder,
			file,
			privates,
			sharedByUser,
			sharedWithUser,
		}).forEach((val) => {
			if (val === "folder") {
				data.push({ name: "Folder", count: folder });
			}
			if (val === "file") {
				data.push({ name: "File", count: file });
			}
			if (val === "privates") {
				data.push({ name: "Private", count: privates });
			}
			if (val === "sharedByUser") {
				data.push({ name: "Shared by You", count: sharedByUser });
			}
			if (val === "sharedWithUser") {
				data.push({ name: "Shared with You", count: sharedWithUser });
			}
		});

		ApiResponse(res, 200, data);
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
			throw new ApiError(401, "Unauthorized request");
		}

		const { type, mediaType, starred, shared, isPrivate, trashed } =
			req.query;

		let whereClause: Prisma.ItemWhereInput = {};

		if (type === "true" && mediaType) {
			whereClause = {
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
			};
		}

		if (starred === "true") {
			whereClause = {
				ownerId: req.userId,
				isStarred: true,
				isTrash: false,
			};
		}

		if (shared === "true") {
			whereClause = {
				sharedWith: { some: { userId: req.userId } },
				isPrivate: true,
				isTrash: false,
			};
		}

		if (isPrivate === "true") {
			whereClause = {
				ownerId: req.userId,
				isPrivate: true,
			};
		}

		if (trashed === "true") {
			whereClause = {
				ownerId: req.userId,
				isTrash: true,
			};
		}

		const items = await db.item.findMany({
			where: whereClause,
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

export async function getSharedItems(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!req.userId) {
			throw new ApiError(401, "Unauthorized request");
		}

		const params = req.params[0].split("/");

		const folderId = params[params.length - 1];

		if (folderId) {
			const existingFolder = await db.item.findFirst({
				where: {
					id: folderId,
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

			const items = await db.item.findMany({
				where: {
					parentId: existingFolder.id,
					isPrivate: true,
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

			return ApiResponse(res, 200, { items });
		}

		const items = await db.item.findMany({
			where: {
				sharedWith: { some: { userId: req.userId } },
				isPrivate: true,
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
			throw new ApiError(401, "Unauthorized request");
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

			return ApiResponse(res, 200, { message: "Item Starred" });
		}

		await db.item.update({
			where: {
				id: item.id,
			},
			data: {
				isStarred: false,
			},
		});

		ApiResponse(res, 200, { message: "Item Unstarred" });
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
			throw new ApiError(401, "Unauthorized request");
		}

		const { userId }: { userId: string } = req.body;

		if (!userId) {
			throw new ApiError(400, "Required field is missing");
		}

		if (userId === req.userId) {
			throw new ApiError(400, "You cannot share item to yourself");
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

		ApiResponse(res, 200, { message: "Permission removed" });
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
			throw new ApiError(401, "Unauthorized request");
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

		ApiResponse(res, 200, { message: "Item sent to trash" });
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
			throw new ApiError(401, "Unauthorized request");
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

		await db.item.update({
			where: {
				id: item.id,
			},
			data: {
				isTrash: false,
			},
		});

		ApiResponse(res, 200, { message: "Item restored" });
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
			throw new ApiError(401, "Unauthorized request");
		}

		const itemId = req.params.itemId;

		if (!itemId) {
			throw new ApiError(400, "ItemId is missing");
		}

		const item = await db.item.findUnique({
			where: { id: itemId, isTrash: true, ownerId: req.userId },
			select: {
				id: true,
				isFolder: true,
				name: true,
				media: true,
				_count: {
					select: {
						childrens: true,
					},
				},
			},
		});

		if (!item) {
			throw new ApiError(404, "Item not found");
		}

		const items = await db.item.findMany({
			where: {
				parentId: item.id,
				isFolder: false,
			},
			select: {
				name: true,
				media: true,
			},
		});

		if (!item.isFolder) {
			const storageRef = getStorage().bucket(bucket.name);
			const ref = storageRef.file("drive/" + item.name);

			await ref.delete();
		}

		items.length > 0 &&
			items.forEach(async (item) => {
				const storageRef = getStorage().bucket(bucket.name);
				const ref = storageRef.file("drive/" + item.name);

				await ref.delete();
			});

		if (item.isFolder && item._count.childrens > 0) {
			await db.$transaction([
				db.item.deleteMany({
					where: { parentId: item.id },
				}),

				db.item.delete({
					where: { id: item.id },
				}),
			]);

			return ApiResponse(res, 200, { message: "Item is deleted" });
		}

		await db.item.delete({
			where: { id: item.id },
		});

		ApiResponse(res, 200, { message: "Item is deleted" });
	} catch (error) {
		next(error);
	}
}
