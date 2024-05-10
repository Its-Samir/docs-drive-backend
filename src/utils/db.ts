import { PrismaClient } from "@prisma/client";

declare global {
	var prisma: PrismaClient | undefined;

	namespace NodeJS {
		interface Process {
			env: ProcessEnv;
		}

		interface ProcessEnv {
			NODE_ENV: "development" | "production";
		}
	}
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
	global.prisma = prisma;
}

export const db = prisma;
