import dotenv from "dotenv";
import watchList from "./seeds/watchList";
import MainIndexer from "./indexer";
import { app } from "./express";
dotenv.config();

const indexer = new MainIndexer({
  networks: ["mainnet"],
  watchList,
  webHookUrl: process.env.WEBHOOK_ADDRESS as string,
});

(async () => {
  // begin tracker with initial data
  indexer.init();
})();

const port = process.env.PORT || 8080;

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
