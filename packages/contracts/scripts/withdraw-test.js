import hre from "hardhat";
import fs from "node:fs";

const { ethers } = await hre.network.connect();

const deployment = JSON.parse(
  fs.readFileSync("./deployments/11155111.json", "utf8")
);

const contractAddress = deployment.address;

console.log("Contract:", contractAddress);

const [signer] = await ethers.getSigners();

const crowdfunding = await ethers.getContractAt(
  "Crowdfunding",
  contractAddress,
  signer
);

const latestBlock = await ethers.provider.getBlock("latest");
const deadline = latestBlock.timestamp + 3600;

const goal = ethers.parseEther("0.001");

console.log("🚀 Starting withdrawal test...");
console.log("Goal:", ethers.formatEther(goal), "ETH");

const createTx = await crowdfunding.createCampaign(
  "FundChain Withdrawal Test",
  "Testing successful campaign withdrawal synchronization",
  goal,
  deadline
);

const createReceipt = await createTx.wait();

const campaignId = (await crowdfunding.campaignCount()) - 1n;

console.log("✅ Campaign created");
console.log("Campaign ID:", campaignId.toString());
console.log("Creation TX:", createReceipt.hash);

const contributionTx = await crowdfunding.contribute(
  campaignId,
  { value: goal }
);

const contributionReceipt = await contributionTx.wait();

console.log("✅ Contribution completed");
console.log("Contribution TX:", contributionReceipt.hash);

const campaign = await crowdfunding.getCampaign(campaignId);

console.log(
  "Raised:",
  ethers.formatEther(campaign.raised),
  "ETH"
);

console.log(
  "Goal:",
  ethers.formatEther(campaign.goal),
  "ETH"
);

const withdrawTx = await crowdfunding.withdraw(campaignId);

const withdrawReceipt = await withdrawTx.wait();

console.log("✅ Withdrawal completed");
console.log("Withdrawal TX:", withdrawReceipt.hash);
console.log("Block:", withdrawReceipt.blockNumber);

console.log("🎉 Withdrawal test complete");
