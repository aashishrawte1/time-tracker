import "dotenv/config";
import express from "express";
import "express-async-errors";
import cors from "cors";
import { connectDB } from "./config/db";
import { errorHandler, notFound } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import timerRoutes from "./routes/timer";
import entryRoutes from "./routes/entries";
import summaryRoutes from "./routes/summary";

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN ? CORS_ORIGIN.split(",").map((o) => o.trim()) : true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/timer", timerRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/summary", summaryRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
