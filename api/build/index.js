import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
dotenv.config();
const app = express();
const PORT = process.env.EXPRESS_PORT || 3001;
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.path}`);
    next();
});
// Routes
app.get("/", (_req, res) => {
    res.send("Hello World!");
});
app.use("/api/v1/report", reportRoutes);
app.use("/api/v1/user", userRoutes);
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
