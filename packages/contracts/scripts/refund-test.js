import hre from "hardhat";

const { ethers } = await hre.network.connect();

const contractAddress =
  "0x624154F0Ea1f67a8Dd93Fd78771EF40F8445dbbc";

const crowdfunding = await ethers.getContractAt(
  "Crowdfunding",
  contractAddress
);

const latestBlock = await ethers.provider.getBlock("latest");

const deadline = latestBlock.timestamp + 120;
const goal = ethers.parseEther("0.01");
const contribution = ethers.parseEther("0.001");

console.log("Creating failed campaign...");
console.log("Goal:", ethers.formatEther(goal), "ETH");
console.log(
  "Deadline:",
  new Date(deadline * 1000).toISOString()
);

const createTx = await crowdfunding.createCampaign(
  "FundChain Refund Test",
  "Testing refund synchronization",
  goal,
  deadline
);

console.log("Create transaction:", createTx.hash);

const createReceipt = await createTx.wait();

console.log(
  "✅ Campaign created in block:",
  createReceipt.blockNumber
);

const campaignId = (await crowdfunding.campaignCount()) - 1n;

console.log("Campaign ID:", campaignId.toString());

console.log(
  "Contributing",
  ethers.formatEther(contribution),
  "ETH..."
);

const contributionTx = await crowdfunding.contribute(
  campaignId,
  {
    value: contribution,
  }
);

console.log(
  "Contribution transaction:",
  contributionTx.hash
);

await contributionTx.wait();

console.log("✅ Contribution confirmed");

console.log("Waiting 130 seconds for campaign to expire...");

await new Promise((resolve) =>
  setTimeout(resolve, 130000)
);

console.log("Attempting refund...");

const refundTx = await crowdfunding.refund(campaignId);

console.log("Refund transaction:", refundTx.hash);

const refundReceipt = await refundTx.wait();

console.log("✅ Refund confirmed");
console.log("Block:", refundReceipt.blockNumber);
console.log("Campaign ID:", campaignId.toString());
