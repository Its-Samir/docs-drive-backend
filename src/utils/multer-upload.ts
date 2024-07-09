import multer from "multer";
import path from "path";

export const storage = multer.diskStorage({
	destination(_, __, callback) {
		callback(null, path.resolve(__dirname, "public", "temp"));
	},
	filename(_, file, callback) {
		callback(
			null,
			crypto.randomUUID().slice(0, 5) +
				"-" +
				file.originalname.split(" ").join("-")
		);
	},
});
