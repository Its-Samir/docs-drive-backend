import multer from "multer";
import path from "path";

let tempDirectory: string;

if (process.env.NODE_ENV === "development") {
	tempDirectory = path.join(__dirname, "../../tmp/");
} else {
	tempDirectory = "/tmp/";
}

export const storage = multer.diskStorage({
	destination: (_, __, callback) => {
		callback(null, tempDirectory);
	},
	filename: (_, file, callback) => {
		const ext = file.originalname.split(".").pop();
		const filename =
			file.originalname.split(".")[0].split(" ").join("-") +
			"-" +
			crypto.randomUUID().slice(0, 5);

		callback(null, filename + "." + ext);
	},
});
