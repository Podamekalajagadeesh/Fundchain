import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);

const abi = [
  "function campaignCount() view returns (uint256)",

  "function getCampaign(uint256 campaignId) view returns (tuple(address creator,string title,string description,uint256 goal,uint256 raised,uint256 deadline,bool withdrawn))",

  "function getContribution(uint256 campaignId,address contributor) view returns (uint256)",

  "function isSuccessful(uint256 campaignId) view returns (bool)",

  "function isFailed(uint256 campaignId) view returns (bool)",

  "function getRemainingAmount(uint256 campaignId) view returns (uint256)",

  "event CampaignCreated(uint256 indexed campaignId,address indexed creator,string title,uint256 goal,uint256 deadline)",

  "event ContributionReceived(uint256 indexed campaignId,address indexed contributor,uint256 amount)",

  "event CampaignWithdrawn(uint256 indexed campaignId,address indexed creator,uint256 amount)",

  "event RefundIssued(uint256 indexed campaignId,address indexed contributor,uint256 amount)"
];

const contract = new ethers.Contract(
  process.env.CROWDFUNDING_CONTRACT_ADDRESS,
  abi,
  provider
);

export { provider, contract };
