import multer from "multer";
import path from "path";

let tempDirectory: string;

if (process.env.NODE_ENV === "development") {
	tempDirectory = path.join(__dirname, "../../temp/");
} else {
	tempDirectory = "/temp/";
}

export const storage = multer.diskStorage({
	destination: (_, __, callback) => {
		callback(null, tempDirectory);
	},
	filename: (_, file, callback) => {
		callback(
			null,
			crypto.randomUUID().slice(0, 5) +
				"-" +
				file.originalname.split(" ").join("-")
		);
	},
});
