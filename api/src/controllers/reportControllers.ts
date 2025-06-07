import { Request, Response } from "express";

export const getReports = (req:Request, res: Response) => {
    res.send('Data Rep');
}