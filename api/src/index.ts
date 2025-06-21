import dotenv from "dotenv";
import path from 'path';
import express, { NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import { Request, Response } from "express";
import userRoutes from './routes/userRoutes'
import reportRoutes from './routes/reportRoutes'
import bodyParser from "body-parser";

dotenv.config(); 

const app = express();
const PORT = process.env.EXPRESS_PORT|| 3001;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`Incoming request: ${req.method} ${req.path}`);
    next();
});

// Routes
app.get("/", (_req: Request, res: Response) => {
    res.send("Hello World!");
});
app.use("/api/v1/report", reportRoutes);
app.use("/api/v1/user", userRoutes);


app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: err.message 
    });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
