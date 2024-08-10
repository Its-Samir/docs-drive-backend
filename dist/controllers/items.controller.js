"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteItem = exports.restoreItem = exports.makeTrash = exports.shareItem = exports.manageStarredItems = exports.getSharedItems = exports.getItemsByQuery = exports.getItemsCount = exports.createFolder = exports.editItem = exports.getItems = exports.getFilePreview = exports.getItemInfo = exports.uploadFile = void 0;
const responses_1 = require("../utils/responses");
const db_1 = require("../utils/db");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const upload_file_1 = require("../utils/upload-file");
const storage_1 = require("firebase-admin/storage");
async function uploadFile(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const params = req.params[0].split("/");
        const folderId = params[params.length - 1];
        const { isPrivate } = req.body;
        if (!req.file)
            return new responses_1.ApiError(400, "File is required");
        const size = req.file.size;
        if (folderId) {
            const existingFolder = await db_1.db.item.findFirst({
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
                throw new responses_1.ApiError(404, "Folder not found");
            }
            const updatedSize = existingFolder.size + size;
            const previewUrl = crypto_1.default.randomBytes(12).toString("hex");
            const imageUrl = await (0, upload_file_1.uploadToBucket)(req.file.path, req.file.filename);
            await db_1.db.$transaction([
                db_1.db.item.create({
                    data: {
                        name: req.file.filename,
                        media: imageUrl,
                        mediaType: req.file.mimetype.startsWith("application/pdf")
                            ? client_1.MediaType.PDF
                            : req.file.mimetype.startsWith("image/")
                                ? client_1.MediaType.IMAGE
                                : req.file.mimetype.startsWith("video/")
                                    ? client_1.MediaType.VIDEO
                                    : req.file.mimetype.startsWith("application/vnd.")
                                        ? client_1.MediaType.OFFICE
                                        : client_1.MediaType.UNKNOWN,
                        previewUrl,
                        size,
                        owner: { connect: { id: req.userId } },
                        parent: { connect: { id: existingFolder.id } },
                        isPrivate: isPrivate === "true" ? true : existingFolder.isPrivate,
                    },
                }),
                db_1.db.item.update({
                    where: { id: existingFolder.id },
                    data: {
                        size: updatedSize,
                    },
                }),
            ]);
            let currentParent = existingFolder.parent;
            while (currentParent) {
                const updatedSize = currentParent.childrens
                    .map((i) => i.size)
                    .reduce((a, c) => a + c) + size; // adding this size because in prisma transaction the updated size of the existing folder wouldn't affect immediately
                await db_1.db.item.update({
                    where: {
                        id: currentParent.id,
                    },
                    data: {
                        size: updatedSize,
                    },
                });
                currentParent =
                    currentParent.parent;
            }
            return (0, responses_1.ApiResponse)(res, 201, { message: "File Uploaded" });
        }
        const previewUrl = crypto_1.default.randomBytes(12).toString("hex");
        const imageUrl = await (0, upload_file_1.uploadToBucket)(req.file.path, req.file.filename);
        const file = await db_1.db.item.create({
            data: {
                name: req.file.filename,
                media: imageUrl,
                mediaType: req.file.mimetype.startsWith("application/pdf")
                    ? client_1.MediaType.PDF
                    : req.file.mimetype.startsWith("image/")
                        ? client_1.MediaType.IMAGE
                        : req.file.mimetype.startsWith("video/")
                            ? client_1.MediaType.VIDEO
                            : req.file.mimetype.startsWith("application/vnd.")
                                ? client_1.MediaType.OFFICE
                                : client_1.MediaType.UNKNOWN,
                previewUrl,
                size,
                owner: { connect: { id: req.userId } },
                isPrivate: isPrivate === "true" ? true : false,
            },
        });
        await db_1.db.user.update({
            where: { id: req.userId },
            data: {
                items: { connect: { id: file.id } },
            },
        });
        (0, responses_1.ApiResponse)(res, 201, { message: "File Uploaded" });
    }
    catch (error) {
        next(error);
    }
}
exports.uploadFile = uploadFile;
async function getItemInfo(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const itemId = req.params.itemId;
        if (!itemId) {
            throw new responses_1.ApiError(400, "ItemId is missing");
        }
        const item = await db_1.db.item.findFirst({
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
            throw new responses_1.ApiError(404, "Item not found");
        }
        return (0, responses_1.ApiResponse)(res, 200, { item });
    }
    catch (error) {
        next(error);
    }
}
exports.getItemInfo = getItemInfo;
async function getFilePreview(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const { previewUrl } = req.params;
        const file = await db_1.db.item.findFirst({
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
            throw new responses_1.ApiError(404, "File not found");
        }
        (0, responses_1.ApiResponse)(res, 200, { file });
    }
    catch (error) {
        next(error);
    }
}
exports.getFilePreview = getFilePreview;
async function getItems(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const params = req.params[0].split("/");
        const folderId = params[params.length - 1];
        if (folderId) {
            const existingFolder = await db_1.db.item.findFirst({
                where: {
                    id: folderId,
                    ownerId: req.userId,
                    isFolder: true,
                    isTrash: false,
                },
            });
            if (!existingFolder) {
                throw new responses_1.ApiError(404, "Folder not found");
            }
            const items = await db_1.db.item.findMany({
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
            return (0, responses_1.ApiResponse)(res, 200, { items });
        }
        const items = await db_1.db.item.findMany({
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
        (0, responses_1.ApiResponse)(res, 200, { items });
    }
    catch (error) {
        next(error);
    }
}
exports.getItems = getItems;
async function editItem(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const itemId = req.params.itemId;
        if (!itemId) {
            throw new responses_1.ApiError(400, "itemId is missing");
        }
        const { name, isPrivate } = req.body;
        if (!name) {
            throw new responses_1.ApiError(400, "Required fields are missing");
        }
        const existingItem = await db_1.db.item.findFirst({
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
            throw new responses_1.ApiError(404, "Item not found");
        }
        if (existingItem.name === name && existingItem.isPrivate === isPrivate) {
            /* prevent unnecessary updates but response is ok as the values are same */
            return (0, responses_1.ApiResponse)(res, 200, { message: "Item is updated" });
        }
        await db_1.db.item.update({
            where: { id: existingItem.id },
            data: {
                name,
                isPrivate,
            },
        });
        (0, responses_1.ApiResponse)(res, 200, { message: "Item is updated" });
    }
    catch (error) {
        next(error);
    }
}
exports.editItem = editItem;
async function createFolder(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const params = req.params[0].split("/");
        const folderId = params[params.length - 1];
        const { name, isPrivate, size } = req.body;
        if (!name) {
            throw new responses_1.ApiError(400, "Required fields are missing");
        }
        const existingItem = await db_1.db.item.findFirst({
            where: { name, ownerId: req.userId },
        });
        if (existingItem)
            throw new responses_1.ApiError(409, "Folder name already exists");
        if (folderId) {
            const existingFolder = await db_1.db.item.findFirst({
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
                throw new responses_1.ApiError(404, "Folder not found");
            }
            const updatedSize = existingFolder.size + size;
            const previewUrl = crypto_1.default.randomBytes(12).toString("hex");
            await db_1.db.$transaction([
                db_1.db.item.create({
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
                db_1.db.item.update({
                    where: { id: existingFolder.id },
                    data: {
                        size: updatedSize,
                    },
                }),
            ]);
            return (0, responses_1.ApiResponse)(res, 201, { message: "Folder Created" });
        }
        const previewUrl = crypto_1.default.randomBytes(12).toString("hex");
        const folder = await db_1.db.item.create({
            data: {
                name,
                previewUrl,
                isFolder: true,
                owner: { connect: { id: req.userId } },
                isPrivate,
                size,
            },
        });
        await db_1.db.user.update({
            where: { id: req.userId },
            data: {
                items: { connect: { id: folder.id } },
            },
        });
        (0, responses_1.ApiResponse)(res, 201, { message: "Folder Created" });
    }
    catch (error) {
        next(error);
    }
}
exports.createFolder = createFolder;
async function getItemsCount(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const [folder, file, privates, sharedByUser, sharedWithUser] = await db_1.db.$transaction([
            db_1.db.item.count({ where: { ownerId: req.userId, isFolder: true } }),
            db_1.db.item.count({ where: { ownerId: req.userId, isFolder: false } }),
            db_1.db.item.count({ where: { ownerId: req.userId, isPrivate: true } }),
            db_1.db.sharedItem.count({ where: { ownerId: req.userId } }),
            db_1.db.sharedItem.count({ where: { userId: req.userId } }),
        ]);
        const data = [];
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
        (0, responses_1.ApiResponse)(res, 200, data);
    }
    catch (error) {
        next(error);
    }
}
exports.getItemsCount = getItemsCount;
async function getItemsByQuery(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const { type, mediaType, starred, shared, isPrivate, trashed } = req.query;
        let whereClause = {};
        if (type === "true" && mediaType) {
            whereClause = {
                ownerId: req.userId,
                mediaType: mediaType === "PDF"
                    ? client_1.MediaType.PDF
                    : mediaType === "IMAGE"
                        ? client_1.MediaType.IMAGE
                        : mediaType === "VIDEO"
                            ? client_1.MediaType.VIDEO
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
        const items = await db_1.db.item.findMany({
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
        (0, responses_1.ApiResponse)(res, 200, { items });
    }
    catch (error) {
        next(error);
    }
}
exports.getItemsByQuery = getItemsByQuery;
async function getSharedItems(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const params = req.params[0].split("/");
        const folderId = params[params.length - 1];
        if (folderId) {
            const existingFolder = await db_1.db.item.findFirst({
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
                throw new responses_1.ApiError(404, "Folder not found");
            }
            const items = await db_1.db.item.findMany({
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
            return (0, responses_1.ApiResponse)(res, 200, { items });
        }
        const items = await db_1.db.item.findMany({
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
        (0, responses_1.ApiResponse)(res, 200, { items });
    }
    catch (error) {
        next(error);
    }
}
exports.getSharedItems = getSharedItems;
async function manageStarredItems(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const { itemId } = req.params;
        if (!itemId) {
            throw new responses_1.ApiError(400, "ItemId is missing");
        }
        const item = await db_1.db.item.findUnique({
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
            throw new responses_1.ApiError(404, "Item not found");
        }
        if (!item.isStarred) {
            await db_1.db.item.update({
                where: {
                    id: item.id,
                },
                data: {
                    isStarred: true,
                },
            });
            return (0, responses_1.ApiResponse)(res, 200, { message: "Item Starred" });
        }
        await db_1.db.item.update({
            where: {
                id: item.id,
            },
            data: {
                isStarred: false,
            },
        });
        (0, responses_1.ApiResponse)(res, 200, { message: "Item Unstarred" });
    }
    catch (error) {
        next(error);
    }
}
exports.manageStarredItems = manageStarredItems;
async function shareItem(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const { userId } = req.body;
        if (!userId) {
            throw new responses_1.ApiError(400, "Required field is missing");
        }
        if (userId === req.userId) {
            throw new responses_1.ApiError(400, "You cannot share item to yourself");
        }
        const itemId = req.params.itemId;
        if (!itemId) {
            throw new responses_1.ApiError(400, "ItemId is missing");
        }
        const item = await db_1.db.item.findUnique({
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
            throw new responses_1.ApiError(404, "Item not found");
        }
        const sharedItem = await db_1.db.sharedItem.findFirst({
            where: {
                ownerId: req.userId,
                userId: userId,
                itemId: item.id,
            },
            select: { id: true },
        });
        if (!sharedItem) {
            await db_1.db.sharedItem.create({
                data: {
                    ownerId: req.userId,
                    user: { connect: { id: userId } },
                    item: { connect: { id: item.id } },
                },
                select: { id: true },
            });
            return (0, responses_1.ApiResponse)(res, 200, { message: "Item is shared" });
        }
        await db_1.db.sharedItem.delete({
            where: {
                id: sharedItem.id,
                ownerId: req.userId,
                userId: userId,
                itemId: item.id,
            },
        });
        (0, responses_1.ApiResponse)(res, 200, { message: "Permission removed" });
    }
    catch (error) {
        next(error);
    }
}
exports.shareItem = shareItem;
async function makeTrash(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const itemId = req.params.itemId;
        if (!itemId) {
            throw new responses_1.ApiError(400, "ItemId is missing");
        }
        const item = await db_1.db.item.findUnique({
            where: { id: itemId, isTrash: false, ownerId: req.userId },
            select: {
                id: true,
            },
        });
        if (!item) {
            throw new responses_1.ApiError(404, "Item not found");
        }
        await db_1.db.item.update({
            where: { id: item.id },
            data: {
                isTrash: true,
            },
        });
        (0, responses_1.ApiResponse)(res, 200, { message: "Item sent to trash" });
    }
    catch (error) {
        next(error);
    }
}
exports.makeTrash = makeTrash;
async function restoreItem(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const itemId = req.params.itemId;
        if (!itemId) {
            throw new responses_1.ApiError(400, "ItemId is missing");
        }
        const item = await db_1.db.item.findUnique({
            where: { id: itemId, isTrash: true, ownerId: req.userId },
            select: {
                id: true,
            },
        });
        if (!item) {
            throw new responses_1.ApiError(404, "Item not found");
        }
        await db_1.db.item.update({
            where: {
                id: item.id,
            },
            data: {
                isTrash: false,
            },
        });
        (0, responses_1.ApiResponse)(res, 200, { message: "Item restored" });
    }
    catch (error) {
        next(error);
    }
}
exports.restoreItem = restoreItem;
async function deleteItem(req, res, next) {
    try {
        if (!req.userId) {
            throw new responses_1.ApiError(401, "Unauthorized request");
        }
        const itemId = req.params.itemId;
        if (!itemId) {
            throw new responses_1.ApiError(400, "ItemId is missing");
        }
        const item = await db_1.db.item.findUnique({
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
            throw new responses_1.ApiError(404, "Item not found");
        }
        const items = await db_1.db.item.findMany({
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
            const storageRef = (0, storage_1.getStorage)().bucket(upload_file_1.bucket.name);
            const ref = storageRef.file("drive/" + item.name);
            await ref.delete();
        }
        items.length > 0 &&
            items.forEach(async (item) => {
                const storageRef = (0, storage_1.getStorage)().bucket(upload_file_1.bucket.name);
                const ref = storageRef.file("drive/" + item.name);
                await ref.delete();
            });
        if (item.isFolder && item._count.childrens > 0) {
            await db_1.db.$transaction([
                db_1.db.item.deleteMany({
                    where: { parentId: item.id },
                }),
                db_1.db.item.delete({
                    where: { id: item.id },
                }),
            ]);
            return (0, responses_1.ApiResponse)(res, 200, { message: "Item is deleted" });
        }
        await db_1.db.item.delete({
            where: { id: item.id },
        });
        (0, responses_1.ApiResponse)(res, 200, { message: "Item is deleted" });
    }
    catch (error) {
        next(error);
    }
}
exports.deleteItem = deleteItem;
