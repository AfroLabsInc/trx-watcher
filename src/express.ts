import express, { Express, Request, Response } from "express";

import cors from "cors";

const app: Express = express();


app.use(cors({
  origin: ['*']
}));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  return res.status(400).json("Server Ready");
});


export { app }
