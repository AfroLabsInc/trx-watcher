# Wallet Watcher

A TypeScript-based blockchain transaction monitoring system that watches multiple addresses across different networks for both native and token transfers.

## Features

- Multi-chain support (Ethereum, Goerli, Polygon, BSC)
- Real-time transaction monitoring
- Webhook notifications for transactions
- Support for both native transfers and ERC20 token transfers
- Configurable watch lists per blockchain
- Built with TypeScript and Ethers.js

## Prerequisites

- Node.js >= 16
- NPM or Yarn
- Alchemy API key for supported networks

## Installation
```bash
npm install
or
yarn install
```

## Configuration

1. Create a `.env` file in the root directory:

```env
PORT=8080
WEBHOOK_ADDRESS=your_webhook_url
PRIVATE_KEY=your_private_key
```

2. Configure your watch list according to the following structure:

```typescript
const watchList = {
  mainnet: {
    tokens: [
      {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        name: "USD Coin",
        symbol: "USDC",
        watchList: ["0x123...", "0x456..."] // Addresses to monitor
      }
    ],
    native: ["0x123...", "0x456..."] // Addresses to monitor for ETH transfers
  },
  goerli: {
    // Similar structure for testnet
  }
};
```

## Usage

### Basic Implementation

```typescript
import MainIndexer from './indexer';

const indexer = new MainIndexer({
  networks: ["mainnet", "goerli"],
  watchList,
  webHookUrl: "https://your-webhook-url.com/webhook"
});

// Initialize the watcher
indexer.init();
```

### Webhook Payload Structure

When a transaction is detected, the following payload is sent to your webhook:

```typescript
{
  from: string;              // Sender address
  to: string;               // Receiver address
  value: number;            // Transaction value
  transactionHash: string;  // Transaction hash
  transactionType: 'token' | 'native';  // Type of transfer
  network: string;          // Network name
  chainId: number;          // Network chain ID
  meta: {
    token_name?: string;    // Token name (for token transfers)
    token_symbol?: string;  // Token symbol (for token transfers)
    blockchain: string;     // Blockchain name
  }
}
```

## Development

```bash
# Run in development mode
npm run dev

# Build the project
npm run build

# Start the production server
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using Commitizen (`npm run cz`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

