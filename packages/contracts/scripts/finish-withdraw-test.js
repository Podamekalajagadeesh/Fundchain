import hre from "hardhat";
import fs from "node:fs";

const { ethers } = await hre.network.connect();

const deployment = JSON.parse(
  fs.readFileSync("./deployments/11155111.json", "utf8")
);

const crowdfunding = await ethers.getContractAt(
  "Crowdfunding",
  deployment.address
);

const campaignId = 2n;
const amount = ethers.parseEther("0.001");

console.log("🎯 Campaign:", campaignId.toString());
console.log("💰 Contribution:", ethers.formatEther(amount), "ETH");

const contributionTx = await crowdfunding.contribute(
  campaignId,
  { value: amount }
);

const contributionReceipt = await contributionTx.wait();

console.log("✅ Contribution completed");
console.log("TX:", contributionReceipt.hash);
console.log("Block:", contributionReceipt.blockNumber);

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

console.log("💸 Withdrawing...");

const withdrawTx = await crowdfunding.withdraw(campaignId);
const withdrawReceipt = await withdrawTx.wait();

console.log("✅ Withdrawal completed");
console.log("TX:", withdrawReceipt.hash);
console.log("Block:", withdrawReceipt.blockNumber);

const finalCampaign = await crowdfunding.getCampaign(campaignId);

console.log("🎉 Final campaign state:");
console.log("Raised:", ethers.formatEther(finalCampaign.raised), "ETH");
console.log("Withdrawn:", finalCampaign.withdrawn);
