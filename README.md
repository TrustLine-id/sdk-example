# Trustline SDK Integration Example

A complete integration example demonstrating how to use **Trustline EVMSDK** (for smart contracts) and **Trustline WebSDK** (for frontend applications) to build a protected payment firewall.

## Overview

This repository contains:

- **Smart Contract** (`contracts/`): A `PaymentFirewall` contract that uses Trustline EVMSDK to ensure all payments are protected
- **Frontend** (`frontend/`): A React + Vite application that uses Trustline WebSDK to interact with the contract via MetaMask

## Project Structure

```
sdk-example/
├── contracts/              # Smart contracts (supports Hardhat & Foundry)
│   ├── contracts/
│   │   └── PaymentFirewall.sol
│   ├── scripts/            # Hardhat deployment scripts (TypeScript)
│   │   ├── deploy.ts
│   │   └── copy-abi.ts
│   ├── script/             # Foundry deployment scripts (Solidity)
│   │   └── Deploy.s.sol
│   ├── hardhat.config.ts   # Hardhat configuration
│   └── foundry.toml        # Foundry configuration
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx         # Main application component
│   │   ├── abis/           # Contract ABIs
│   │   └── ...
│   └── vite.config.ts
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension
- Access to Trustline Validation Engine addresses (for contract deployment)
- **Optional**: Foundry (for Foundry support) - install via [foundryup](https://book.getfoundry.sh/getting-started/installation)

**Note:** The `contracts` and `frontend` folders are independent: set up one `npm` environment in each.

### Building and Deploying the Contract

From the root folder:

1. **Install Foundry (optional, for Foundry support):**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup

2. **Go to the contracts folder:**
   ```bash
   cd contracts
   ```

3. **Set up the environment:**
   ```bash
   npm install
   ```

4. **Install forge-std (optional, for Foundry support):**
   ```bash
   forge install foundry-rs/forge-std
   ```

4. **Compile contracts**:
   
   **Using Hardhat:**
   ```bash
   npm run compile
   ```
   
   **Using Foundry:**
   ```bash
   npm run compile:forge
   ```

5. **Copy ABI to frontend** (after compiling):
   ```bash
   npm run copy-abi
   ```
   Works with both Hardhat and Foundry builds.
   Your contract ABI is found at `/frontend/src/abis/PaymentFirewall.json`.

### Deployment

#### Testnet/Mainnet Deployment

From the root folder:

1. **Go to the contracts folder:**
   ```bash
   cd contracts
   ```

2. **Set the deployment env variable:**

   ```bash
   export TRUSTLINE_VALIDATION_ENGINE_LOGIC=<logic-address-from-supported-blockchains-list-prefixed-with-0x>
   export TRUSTLINE_VALIDATION_ENGINE_PROXY=0x0000000000000000000000000000000000000000
   export PRIVATE_KEY=<your-private-key-prefixed-with-0x>
   export RPC_URL=<rpc-url>
   ```
   
3. **Deploy:**

   **Using Hardhat:**
   ```bash
   npm run deploy -- --network env-chain
   ```
   
   **Using Foundry:**
   ```bash
   forge script script/Deploy.s.sol:DeployPaymentFirewall --broadcast --rpc-url ${RPC_URL}
   ```
   
   > **Note:** See [Configuration](#configuration) below for details on these environment variables.
   
### Configure the Protection Policies
   
   To configure the policy active on your deployed contract, go to [onboarding](https://onboarding.trustline.id/) with the deployed contract address and ABI.
   
   > **Note:** Your contract ABI is the array [] after `abi :` in `/frontend/src/abis/PaymentFirewall.json`.

### Running the Frontend

From the root folder:

1. **Go to the frontend folder:**
   ```bash
   cd frontend
   ```

1. **Set up the environment:**
   ```bash
   npm install
   ```

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   - The app will open at `http://localhost:3000`
   - Make sure MetaMask is installed and connected to the correct network

## Usage

### Smart Contract

The `PaymentFirewall` contract provides:

- **`payEthers(address payable destination)`** — Pay native ETH to a recipient. The recipient address is validated using Trustline EVMSDK; send the amount as `msg.value`.

### Frontend

The frontend provides a simple UI to:

1. **Connect MetaMask wallet**
   - Click "Connect MetaMask" button
   - Approve the connection in MetaMask

2. **Pay Ethers**
   - Enter recipient address
   - Enter amount in ETH
   - Click "Pay Ethers"
   - Transaction is validated by Trustline before execution
   - Confirm transaction in MetaMask

## Configuration

### Environment Variables

**Contracts (deployment):**

- **`TRUSTLINE_VALIDATION_ENGINE_LOGIC`**: Set this to one of the **Validation Engine** addresses available at [https://dev.trustline.id/implementation-list](https://dev.trustline.id/implementation-list). Pick the entry that matches your target chain.
- **`TRUSTLINE_VALIDATION_ENGINE_PROXY`**: In most cases set this to `0x0000000000000000000000000000000000000000`. A proxy will be deployed automatically. Only if you already have a proxy deployed and know what you are doing, set this to your proxy address and set `TRUSTLINE_VALIDATION_ENGINE_LOGIC` to `0x0000000000000000000000000000000000000000`.
- **`PRIVATE_KEY`**: The deployer wallet private key (with `0x` prefix). Used by Hardhat and Foundry to sign deployment transactions. Keep this secret and never commit it.
- **`RPC_URL`**: The JSON-RPC URL of the target chain (e.g. `https://sepolia.base.org` for Base Sepolia). Used when deploying with the configured network (e.g. `env-chain` in Hardhat).

**Frontend:**
- `VITE_CONTRACT_ADDRESS`: Deployed PaymentFirewall contract address (optional, will be used as default address in the UI).

## Packages Used

- **[@trustline.id/evmsdk](https://www.npmjs.com/package/@trustline.id/evmsdk)**: Smart contract SDK for Trustline integration
- **[@trustline.id/websdk](https://www.npmjs.com/package/@trustline.id/websdk)**: Frontend SDK for Trustline integration
- **ethers.js**: Ethereum library for contract interactions
- **React + Vite**: Modern frontend framework
- **Hardhat**: Ethereum development environment (TypeScript-based)
- **Foundry**: Ethereum development toolkit (Solidity-based, optional)

## Notes

- The contract uses `requireTrustline()` from the Trustlined base contract to validate addresses
- All payments are automatically checked before execution
- The frontend uses WebSDK for Trustline's validation feature
- The contract protection `requireTrustline()` is line 17 in the [PaymentFirewall.sol](https://github.com/TrustLine-id/sdk-example/blob/master/contracts/contracts/PaymentFirewall.sol) contract.
- The frontend validation trigger is line 193 in [App.tsx](https://github.com/TrustLine-id/sdk-example/blob/master/frontend/src/App.tsx):  `const validationResponse = await trustline.validate({...`.
- Make sure to have sufficient ETH and gas for transactions
- This project supports both **Hardhat** and **Foundry** - use whichever you prefer!
  - Hardhat: TypeScript-based, great for complex deployments
  - Foundry: Solidity-based, faster compilation and testing

## Contributing

This is an example repository. Feel free to use it as a starting point for your own projects.

You can explore possibilities by starting with standard contracts, such as those provided by [openZeppelin](https://github.com/binodnp/openzeppelin-solidity/tree/master/contracts), adding `requireTrustline()` and generating a UI from the ABI.

## License

MIT

## Links

- [Trustline EVMSDK](https://www.npmjs.com/package/@trustline.id/evmsdk)
- [Trustline WebSDK](https://www.npmjs.com/package/@trustline.id/websdk)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

