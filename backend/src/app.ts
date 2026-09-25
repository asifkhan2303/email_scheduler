import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import emailRoutes from "./routes/email.routes";

export const app = express();

app.use(cors({
  origin: env.frontendUrl,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(multer().none());
app.use(cookieParser());


// for intial health check--> app is running or not
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? "Internal server error" : error.message });
});
