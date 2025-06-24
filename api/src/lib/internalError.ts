import { Response } from "express";

export function internalError(res: Response, msg: string, error?: unknown) {
  console.error(msg, error);
  return res.status(500).json({
    error: msg,
    details: error instanceof Error ? error.message : undefined,
  });
}
