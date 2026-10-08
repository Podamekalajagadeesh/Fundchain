# FundChain

> A full-stack decentralized crowdfunding platform built with Next.js, Node.js, PostgreSQL, Prisma, Solidity, and Ethereum.

## 🚀 Live Project

- Network: Ethereum Sepolia
- Smart Contract: `0x624154F0Ea1f67a8Dd93Fd78771EF40F8445dbbc`

## ✨ Features

- MetaMask wallet connection
- Wallet-based authentication
- Campaign creation
- ETH contributions
- Creator withdrawals
- Contributor refunds
- Blockchain event synchronization
- PostgreSQL persistence

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React |
| Backend | Node.js, Express |
| Database | PostgreSQL, Prisma |
| Blockchain | Ethereum Sepolia |
| Smart Contracts | Solidity, Hardhat |
| Web3 | ethers.js |
| Wallet | MetaMask |
| Package Manager | pnpm |

## 🏗️ Architecture

```text
MetaMask
   ↓
Next.js Frontend
   ↓ REST API
Node.js + Express API
   ├── PostgreSQL + Prisma
   └── Ethereum Sepolia → Crowdfunding.sol
```

## 🧪 Smart Contract Testing

The smart contract test suite contains **41 passing tests**.

```bash
pnpm exec hardhat test
```

## 🔐 Smart Contract

Crowdfunding.sol supports campaign creation, contributions, withdrawals, refunds, deadlines, goal tracking, contribution tracking, and reentrancy protection.

## 📁 Project Structure

```text
fundchain/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── contracts/
│   ├── database/
│   └── shared/
├── docs/
├── package.json
└── pnpm-workspace.yaml
```

## 📊 Current Status

- Architecture: Complete
- Next.js Frontend: Complete
- Express API: Complete
- PostgreSQL + Prisma: Complete
- Smart Contract: Complete
- Contract Tests: 41/41 passing
- Sepolia Deployment: Complete
- Wallet Authentication: Complete
- Blockchain Sync: Complete
- Campaign Creation: Complete
- ETH Donations: Complete
- Withdrawals: Complete
- Refunds: Complete
- Production Build: Passing

## 🎯 Future Improvements

- User dashboard
- Campaign analytics
- Transaction history
- Search and filtering
- Pagination
- IPFS campaign images
- Contract verification
- Production monitoring

## 📜 License

MIT License

## 👨‍💻 Author

**Jagadeesh P**

Full-Stack Web3 Developer
