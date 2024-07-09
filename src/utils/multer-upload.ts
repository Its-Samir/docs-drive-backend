import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(require.main?.path!);
const __dirname = path.dirname(__filename);

export const storage = multer.diskStorage({
	destination(_, __, callback) {
		callback(null, path.join(__dirname, "./public/temp"));
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
