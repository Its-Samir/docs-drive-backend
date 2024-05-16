import passport from "passport";
import { db } from "./db.ts";
import { ApiError } from "./responses/responses.ts";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User as UserSchema } from "@prisma/client";

declare global {
	namespace Express {
		interface User extends UserSchema {}

		interface Request {
			user?: User;
		}
	}
}

passport.serializeUser<string>((user, done) => {
	done(null, user.id);
});

passport.deserializeUser<string>(async (id, done) => {
	try {
		const user = await db.user.findUnique({ where: { id } });

		if (!user) {
			done(new ApiError(404, "User not found"));
		} else {
			done(null, user);
		}
	} catch (error) {
		done(new ApiError(500, "User deserialization failed"));
	}
});

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			callbackURL: process.env.GOOGLE_CALLBACK_URL!,
		},
		async (_, __, profile, cb) => {
			try {
				const user = await db.user.findFirst({
					where: { oauthId: profile.id },
				});

				if (user) {
					cb(null, user);
				} else {
					const newUser = await db.user.create({
						data: {
							name:
								profile._json.name ||
								(profile._json.email as string).split("@")[0],
							email: profile._json.email!,
							oauthId: profile.id,
							image: profile._json.picture,
						},
					});

					cb(null, newUser);
				}

			} catch (error) {
				cb(new ApiError(500, "Oauth strategy failed"));
			}
		}
	)
);
