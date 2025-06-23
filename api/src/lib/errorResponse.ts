import { Response } from "express";

export function errorResponse(res: Response, msg: string, error?: unknown, code = 500) {
  console.error(msg, error);
  return res.status(code).json({
    error: msg,
    details: error instanceof Error ? error.message : undefined,
  });
}