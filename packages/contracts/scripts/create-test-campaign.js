import hre from "hardhat";
import "dotenv/config";

const { ethers } = await hre.network.connect();

const contractAddress =
  "0x624154F0Ea1f67a8Dd93Fd78771EF40F8445dbbc";

const crowdfunding = await ethers.getContractAt(
  "Crowdfunding",
  contractAddress
);

const latestBlock = await ethers.provider.getBlock("latest");

const deadline = latestBlock.timestamp + 3600;

const goal = ethers.parseEther("0.01");

console.log("Creating test campaign...");
console.log("Goal:", ethers.formatEther(goal), "ETH");
console.log("Deadline:", new Date(deadline * 1000).toISOString());

const tx = await crowdfunding.createCampaign(
  "FundChain Sync Test",
  "Testing blockchain event synchronization",
  goal,
  deadline
);

console.log("Transaction:", tx.hash);

const receipt = await tx.wait();

console.log("Confirmed!");
console.log("Block:", receipt.blockNumber);
console.log("Campaign created on Sepolia.");
