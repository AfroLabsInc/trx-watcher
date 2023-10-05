import { Contract, utils } from "ethers";
import Contracts from "./contracts";
import Provider from "./connection/provider";
import {
  Alchemy,
  Network,
  AlchemySubscription,
  WebSocketNamespace,
} from "alchemy-sdk";
import NetworkUtils from "./utils/networkUtils";
import sendWebHook from "./webhookParser";
import {
  IndexerCfig,
  WalletCfig,
  networkName,
  trxResponse,
} from "./types/types";

export default class MainIndexer {
  public watchList: WalletCfig;
  public webhookUrl: string;
  private networks: networkName[];
  private allConnections: {
    contracts: Contract[];
    websockets: WebSocketNamespace[];
  } = {
    contracts: [],
    websockets: [],
  };

  constructor(config: {
    networks: networkName[];
    watchList: WalletCfig;
    webHookUrl: string;
  }) {
    this.watchList = config.watchList;
    this.webhookUrl = config.webHookUrl;
    this.networks = config.networks;
  }

  public init(isReRun: boolean = false): void {
    this.networks.forEach((n) => {
      this.runIndexer(n, this.watchList[n], isReRun);
    });

    return;
  }

  /**
   * Index a specific blockchain network
   * @param network blockchain network. e.g 'mainnet', 'polygon'
   * @param conFig Represents the configuration of the blockchain network watcher
   * @param isReRun
   */
  protected async runIndexer(
    network: string,
    conFig: IndexerCfig,
    isReRun: boolean = false
  ): Promise<void> {
    const contracts = new Contracts(network);
    const provider = new Provider(network).provider;

    const websocket = this.websocketInstance(network);

    if (isReRun) {
      this.stopListening();
    }
    try {
      console.log("Started Watcher on " + network);

      conFig.tokens.forEach((token) => {
        const tokenContract = contracts.tokenContract(token.address);

        // Token Bloc Receiver
        tokenContract.on("Transfer", async (from, to, value, trx) => {
          if (
            token.watchList.find((a) => a === from) ||
            token.watchList.find((a) => a === to)
          ) {
            const data: trxResponse = {
              from,
              to,
              value: Number(utils.formatUnits(value, 6)),
              transactionHash: trx.transactionHash,
              transactionType: "token",
              text: "Token Transaction",
              meta: {
                token_name: token.name,
                token_symbol: token.symbol,
                blockchain: NetworkUtils.getNetwork(network)?.name as string,
              },
              network: network,
              chainId: NetworkUtils.getChainId(network),
              contractAddress: trx.address,
            };

            sendWebHook(data, this.webhookUrl);
          }
        });

        // push all active listeners
        this.allConnections.contracts.push(tokenContract);

        console.log(JSON.stringify(tokenContract.listenerCount()));
      });

      // Native Transfer Bloc Receiver
      const wsNameSpace = websocket.ws.on(
        {
          method: AlchemySubscription.PENDING_TRANSACTIONS,
          fromAddress: conFig.native, // Replace with address to recieve pending transactions from this address
          toAddress: conFig.native, // Replace with address to send  pending transactions to this address
        },
        (tx) => {
          provider.once(tx.hash, async (confirmedTx) => {
            console.log(confirmedTx);
            const { from, to, value, hash } = await provider.getTransaction(
              confirmedTx.transactionHash
            );

            const data: trxResponse = {
              from,
              to: to!,
              value: Number(utils.formatUnits(value)),
              transactionHash: hash,
              transactionType: "native",
              network: network,
              chainId: NetworkUtils.getChainId(network),
              contractAddress: null,
              text: "Native Transfer",
              meta: {
                blockchain_symbol: NetworkUtils.getNetwork(network)?.currency,
                blockchain: NetworkUtils.getNetwork(network)?.name as string,
              },
            };
            sendWebHook(data, this.webhookUrl);
          });
        }
      );

      this.allConnections.websockets.push(wsNameSpace);
    } catch (error) {
      console.log(error);
    }
  }

  public stopListening() {

    (Object.keys(this.allConnections) as ('contracts'| 'websockets')[]).forEach((t) => {
      this.allConnections[t].forEach((connection) => {
        connection.removeAllListeners();
      });
    });
    
    this.allConnections = {
      contracts: [],
      websockets: [],
    };
  }

  public websocketInstance(network: string): Alchemy {
    const settings = {
      apiKey: NetworkUtils.getRpcApiKey(network), // Replace with your Alchemy API Key
      network: `eth-${network}` as Network, // Replace with your network
    };

    const alchemy = new Alchemy(settings);

    return alchemy;
  }
}
