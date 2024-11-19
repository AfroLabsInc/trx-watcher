import express, { Express, Request, Response } from "express";

import cors from "cors";

import { Logger } from './utils/Logger';
import { CONFIG } from './config/config';

const app: Express = express();

const logger = Logger.getInstance();

app.use(cors({
  origin: ['*']
}));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  return res.status(400).json("Server Ready");
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.get("/metrics", (req: Request, res: Response) => {
  res.json({
    logs: logger.getLogs()
  });
});

app.post("/config", (req: Request, res: Response) => {
  try {
    // Add validation here
    Object.assign(CONFIG, req.body);
    res.json({ success: true, config: CONFIG });
  } catch (error) {
    res.status(400).json({ error: "Invalid configuration" });
  }
});

export { app }
