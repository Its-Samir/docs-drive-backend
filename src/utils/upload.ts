import admin from "firebase-admin";
import { getDownloadURL, getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";
import { unlinkSync } from "fs";

admin.initializeApp({
	credential: admin.credential.cert({
		clientEmail: process.env.CLIENT_EMAIL,
		privateKey: process.env.PRIVATE_KEY,
		projectId: process.env.PROJECT_ID,
	}),
	storageBucket: process.env.STORAGE_BUCKET,
});

export const bucket = admin.storage().bucket();

export const upload = async (path: string, filename: string) => {
	const url = await bucket.upload(path, {
		destination: "drive/" + filename,
		public: true,
		metadata: {
			metadata: {
				firebaseStorageDownloadTokens: uuidv4(),
			},
		},
	});

	const storageRef = getStorage().bucket(bucket.name);

	const file = storageRef.file(url[0].metadata.name!);

	const imageUrl = await getDownloadURL(file);

	unlinkSync(path);

	return imageUrl;
};
