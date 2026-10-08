import hre from "hardhat";

const { ethers } = await hre.network.connect();

const contractAddress =
  "0x624154F0Ea1f67a8Dd93Fd78771EF40F8445dbbc";

const crowdfunding = await ethers.getContractAt(
  "Crowdfunding",
  contractAddress
);

const campaignId = 0;
const amount = ethers.parseEther("0.001");

console.log("Contributing to campaign:", campaignId);
console.log("Amount:", ethers.formatEther(amount), "ETH");

const tx = await crowdfunding.contribute(campaignId, {
  value: amount,
});

console.log("Transaction:", tx.hash);

const receipt = await tx.wait();

console.log("✅ Contribution confirmed");
console.log("Block:", receipt.blockNumber);
console.log("Amount:", ethers.formatEther(amount), "ETH");
