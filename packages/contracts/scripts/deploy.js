import hre from "hardhat";
import "dotenv/config";
import fs from "fs";
import path from "path";

const { ethers } = await hre.network.connect();

async function main() {
    console.log("🚀 Deploying FundChain Crowdfunding...");

    const [deployer] = await ethers.getSigners();

    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(
        deployer.address
    );

    console.log(
        "Balance:",
        ethers.formatEther(balance),
        "ETH"
    );

    const Crowdfunding =
        await ethers.getContractFactory("Crowdfunding");

    const crowdfunding =
        await Crowdfunding.deploy();

    await crowdfunding.waitForDeployment();

    const address =
        await crowdfunding.getAddress();

    const network =
        await ethers.provider.getNetwork();

    console.log("\n✅ Crowdfunding deployed");
    console.log("Contract:", address);
    console.log("Chain ID:", network.chainId.toString());

    const deployment = {
        contract: "Crowdfunding",
        address,
        chainId: network.chainId.toString(),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
    };

    const deploymentPath = path.join(
        process.cwd(),
        "deployments",
        `${network.chainId.toString()}.json`
    );

    fs.writeFileSync(
        deploymentPath,
        JSON.stringify(deployment, null, 2)
    );

    console.log(
        "Deployment saved:",
        deploymentPath
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
