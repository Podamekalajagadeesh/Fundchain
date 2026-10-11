# FundChain — Full-Stack Web3 Crowdfunding Platform

FundChain is a full-stack decentralized crowdfunding platform that combines Ethereum smart contracts with a modern web application backend. It enables users to create crowdfunding campaigns, contribute ETH, and manage campaign outcomes through blockchain-based transactions.

The application integrates a Next.js frontend, a Node.js and Express API, PostgreSQL persistence with Prisma, and Solidity smart contracts deployed to the Ethereum Sepolia testnet.

The project demonstrates full-stack Web3 development, wallet-based authentication, smart-contract integration, REST API development, and blockchain event synchronization.

## 🔗 Project Links

- **GitHub Repository:** https://github.com/Podamekalajagadeesh/Fundchain
- **Live Demo:** https://fundchain-theta-kohl.vercel.app
- **Network:** Ethereum Sepolia
- **Crowdfunding Contract:** `0x624154F0Ea1f67a8Dd93Fd78771EF40F8445dbbc`

## ✨ Features

### Crowdfunding

- Create crowdfunding campaigns.
- Define campaign funding goals and deadlines.
- Contribute ETH through a connected Ethereum wallet.
- Track campaign funding and contributor information.
- Allow campaign creators to withdraw funds when contract conditions are satisfied.
- Support refunds for eligible unsuccessful campaigns.

### Wallet Integration and Authentication

- Connect an Ethereum wallet using MetaMask.
- Support wallet-based authentication through message signing.
- Integrate frontend interactions with Ethereum smart contracts.

### Backend and Data Management

- Provide REST API functionality through Node.js and Express.
- Persist application data in PostgreSQL using Prisma.
- Synchronize blockchain events with application data.
- Separate frontend, backend, database, and smart-contract responsibilities.

## 🏗️ System Architecture

FundChain uses a modular architecture that connects the user interface, backend services, database, and Ethereum blockchain.

```text
User
  |
  v
MetaMask Wallet
  |
  v
Next.js + React Frontend
  |
  | REST API
  v
Node.js + Express Backend
  |
  +----------------------+
  |                      |
  v                      v
PostgreSQL + Prisma   Ethereum Sepolia
                         |
                         v
                  Crowdfunding.sol
```

The frontend handles user interactions and wallet connectivity. The backend provides API functionality and database integration, while the smart contract enforces crowdfunding rules on-chain.

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Prisma |
| Smart Contracts | Solidity, Hardhat |
| Blockchain | Ethereum Sepolia |
| Web3 Integration | ethers.js |
| Wallet | MetaMask |
| Package Management | pnpm |

## 📜 Smart Contract

The `Crowdfunding.sol` contract implements the on-chain crowdfunding functionality.

Its responsibilities include:

- Campaign creation
- ETH contributions
- Campaign goal tracking
- Campaign deadlines
- Contribution tracking
- Creator withdrawals
- Contributor refunds
- Reentrancy protection

The contract is deployed to Ethereum Sepolia.

**Contract address:**

`0x624154F0Ea1f67a8Dd93Fd78771EF40F8445dbbc`

Before presenting the project as independently verified, confirm whether the deployed contract has published source verification. Contract deployment alone does not establish source verification or an independent security audit.

## 🧪 Smart Contract Testing

The repository README reports **41 passing smart-contract tests**.

The test suite is intended to validate crowdfunding contract behavior and important transaction conditions.

Run the tests from the repository root:

```bash
pnpm install
pnpm exec hardhat test
```

Run the test suite before publishing an updated test count. Only list individual test scenarios that are confirmed by the actual test files.

## 📁 Project Structure

FundChain uses a pnpm workspace to organize its applications and shared packages.

```text
Fundchain/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Node.js and Express API
├── packages/
│   ├── contracts/    # Smart contracts and tests
│   ├── database/     # Database and Prisma
│   └── shared/       # Shared application code
├── docs/
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## ⚙️ Local Development

### Prerequisites

Install the following tools:

- Node.js
- pnpm
- Git
- PostgreSQL
- MetaMask, for wallet interactions

### 1. Clone the repository

```bash
git clone https://github.com/Podamekalajagadeesh/Fundchain.git
cd Fundchain
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Configure the environment variables required by the frontend, backend, database, and blockchain integration.

Use the variable names expected by the application's configuration and documentation. Set up a local PostgreSQL database if required.

Never commit private keys, seed phrases, database passwords, or API secrets. Provide placeholder values in any example environment file.

### 4. Start the applications

Use the scripts defined in the root and individual workspace `package.json` files to start the frontend and API.

For example, inspect the available scripts with:

```bash
pnpm run
```

Follow the repository's actual workspace scripts and database setup instructions rather than assuming a particular development command.

## 🔄 Blockchain Event Synchronization

FundChain includes blockchain event synchronization as part of its full-stack architecture.

This connects on-chain crowdfunding activity with the application's database layer, allowing the backend to maintain application data associated with blockchain events.

For reliability, event synchronization should account for repeated events, failed processing, and differences between database state and on-chain state.

## 🔐 Security Considerations

The project combines wallet interactions, backend APIs, database persistence, and smart-contract transactions. Important security considerations include:

- Validate wallet signatures and associate them with the correct address.
- Protect backend authentication and authorization routes.
- Validate user input in API requests.
- Keep database credentials and application secrets out of source control.
- Enforce campaign rules in the smart contract rather than relying solely on frontend checks.
- Protect withdrawals and refunds through contract-level access and eligibility checks.
- Test smart-contract behavior before deployment.

These are security considerations for the architecture, not a claim that every item has been independently audited.

## 📊 Project Status

According to the current repository README:

| Component | Reported status |
|---|---|
| Next.js frontend | Complete |
| Express API | Complete |
| PostgreSQL and Prisma | Complete |
| Crowdfunding smart contract | Complete |
| Smart-contract tests | 41 passing |
| Sepolia deployment | Complete |
| Wallet authentication | Complete |
| Blockchain synchronization | Complete |
| Campaign creation | Complete |
| ETH contributions | Complete |
| Withdrawals and refunds | Complete |
| Production build | Passing, as reported |

Re-run the relevant tests and build commands to confirm these statuses before relying on them in job applications.

## 🚀 Future Improvements

- User dashboard
- Campaign analytics
- Transaction history
- Campaign search and filtering
- Pagination
- IPFS-based campaign images
- Smart-contract source verification, if not yet completed
- Production monitoring

## 🎯 Project Highlights

FundChain demonstrates practical experience with:

- Full-stack Web3 application architecture
- Solidity smart-contract development
- Ethereum wallet integration
- REST API development
- PostgreSQL database integration
- Prisma-based data access
- Blockchain event synchronization
- Smart-contract testing
- Monorepo and workspace organization

## 👨‍💻 Author

**Jagadeesh P**

Full-Stack Web3 Developer

Areas of focus:

- Solidity and smart contracts
- Ethereum and decentralized applications
- Next.js and React
- Node.js and Express
- PostgreSQL and Prisma
- Blockchain-integrated backend systems

## 📄 License

MIT License

Confirm that the repository contains an MIT `LICENSE` file before using this section.
