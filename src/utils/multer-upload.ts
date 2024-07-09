import multer from "multer";

export const storage = multer.diskStorage({
	destination: require.main?.path + "/" +" public/temp/",
	filename(_, file, callback) {
		callback(
			null,
			crypto.randomUUID().slice(0, 5) +
				"-" +
				file.originalname.split(" ").join("-")
		);
	},
});
