import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { Request, Response } from "express";
import path from 'path';
import userRoutes from './routes/userRoutes'
import reportRoutes from './routes/reportRoutes'

dotenv.config(); 
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.EXPRESS_PORT|| 3000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// // Routes
app.use("/api/v1/report", reportRoutes);
app.use("/api/v1/user", userRoutes);
app.get("/", (_req: Request, res: Response) => {
    res.send("Hello World!");
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
