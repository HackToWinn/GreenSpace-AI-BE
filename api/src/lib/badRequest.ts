import { Response } from "express";

export function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}
