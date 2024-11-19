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
import { ConnectionManager } from './utils/ConnectionManager';
import { HealthMonitor } from './utils/HealthMonitor';
import { RateLimiter } from './utils/RateLimiter';
import { Logger, LogLevel } from './utils/Logger';
import { CONFIG } from './config/config';

export default class MainIndexer {
  public watchList: WalletCfig;
  public webhookUrl: string;
  public networks: networkName[];
  private allConnections: {
    contracts: Contract[];
    websockets: WebSocketNamespace[];
  } = {
    contracts: [],
    websockets: [],
  };
  private readonly connectionManager: ConnectionManager;
  private readonly healthMonitor: HealthMonitor;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;
  private providers: Map<string, Provider> = new Map();

  constructor(config: {
    networks: networkName[];
    watchList: WalletCfig;
    webHookUrl: string;
  }) {
    this.watchList = config.watchList;
    this.webhookUrl = config.webHookUrl;
    this.networks = config.networks;
    this.logger = Logger.getInstance();
    this.connectionManager = new ConnectionManager(
      CONFIG.retry.maxAttempts,
      CONFIG.retry.delay,
      this.logger
    );
    this.healthMonitor = new HealthMonitor(
      CONFIG.healthCheck.interval,
      this.logger
    );
    this.rateLimiter = new RateLimiter(
      CONFIG.rateLimit.windowMs,
      CONFIG.rateLimit.maxRequests,
      this.logger
    );
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
    const provider = new Provider(network);
    
    this.providers.set(network, provider);

    const websocket = this.websocketInstance(network);

    if (isReRun) {
      this.stopListening();
    }
    try {
      console.log("Started Watcher on " + network);

      conFig.tokens.forEach((token) => {
        const tokenContract = contracts.tokenContract(token.address);

        // Token Bloc Receiver
        tokenContract.on("Transfer", async (from: string, to: string, value: string, trx: any) => {
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
          provider.provider.once(tx.hash, async (confirmedTx: any) => {
            console.log(confirmedTx);
            const { from, to, value, hash } = await provider.provider.getTransaction(
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

  async processTransaction(network: string, transaction: any): Promise<void> {
    if (!(await this.rateLimiter.checkLimit(network))) {
      throw new Error('Rate limit exceeded');
    }

    // Your existing transaction processing code here
    
    this.healthMonitor.updatePing();
  }

  public getProvider(network: string): Provider | undefined {
    return this.providers.get(network);
  }
}
