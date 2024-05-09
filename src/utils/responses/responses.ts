import { Response } from "express";

export class ApiError extends Error {
	statusCode: number;

	constructor(statuscode: number, message: string) {
		super();
		this.message = message;
		this.statusCode = statuscode;
	}
}

export function ApiResponse(res: Response, statusCode: number, payload: any) {
	return res.status(statusCode).json(payload);
}
