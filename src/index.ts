import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import watchList from "./seeds/watchList";
import MainIndexer from "./indexer";
dotenv.config();

const indexer = new MainIndexer({
  networks: ["mainnet", "goerli"],
  watchList,
  webHookUrl: process.env.WEBHOOK_ADDRESS as string,
});

(async () => {
  // begin tracker with initial data
  indexer.init();
})();

const app: Express = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  return res.status(400).json("Server Ready");
});

/**
 * Recieve and track WalletCfig
 */
app.post("/watch", async (req, res) => {
  const { body } = req;
  try {
    indexer.watchList = body;

    console.log(body, " started from post");

    indexer.init(true);
  } catch (e) {
    console.log(e);
    return res.status(400).json();
  }
  return res.status(200).json();
});
app.listen(port, () => {
  console.log(`Listening for API Calls on port: ${port}`);
});
