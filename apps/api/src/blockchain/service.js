import { contract } from "./contract.js";

export async function getCampaignCount() {
  const count = await contract.campaignCount();
  return Number(count);
}

export async function getCampaign(campaignId) {
  const campaign = await contract.getCampaign(campaignId);

  return {
    creator: campaign.creator,
    title: campaign.title,
    description: campaign.description,
    goal: campaign.goal.toString(),
    raised: campaign.raised.toString(),
    deadline: Number(campaign.deadline),
    withdrawn: campaign.withdrawn,
  };
}

export async function getContribution(campaignId, contributor) {
  const amount = await contract.getContribution(
    campaignId,
    contributor
  );

  return amount.toString();
}

export async function isSuccessful(campaignId) {
  return await contract.isSuccessful(campaignId);
}

export async function isFailed(campaignId) {
  return await contract.isFailed(campaignId);
}

export async function getRemainingAmount(campaignId) {
  const amount = await contract.getRemainingAmount(campaignId);
  return amount.toString();
}
