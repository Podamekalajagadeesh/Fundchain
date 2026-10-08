import { contract } from "./contract.js";
import { ethers } from "ethers";
import prisma from "../database/prisma.js";

async function ensureCampaignCreated(event) {
  const {
    campaignId,
    creator,
    title,
    goal,
    deadline,
  } = event.args;

  const txHash = event.transactionHash ?? event.log?.transactionHash;
  const blockNumber = event.blockNumber ?? event.log?.blockNumber;
  const logIndex = event.index ?? event.log?.index;

  const goalEth = ethers.formatEther(goal);
  const deadlineDate = new Date(Number(deadline) * 1000);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        wallet: creator.toLowerCase(),
      },
      update: {},
      create: {
        wallet: creator.toLowerCase(),
      },
    });

    let campaign = await tx.campaign.findFirst({
      where: {
        contractCampaignId: campaignId.toString(),
      },
    });

    if (!campaign) {
      campaign = await tx.campaign.create({
        data: {
          creatorId: user.id,
          title,
          description: "",
          contractCampaignId: campaignId.toString(),
          goalAmount: goalEth,
          raisedAmount: "0",
          deadline: deadlineDate,
          status: "ACTIVE",
        },
      });

      console.log(
        "✅ Campaign created in database:",
        campaign.id
      );
    }

    await tx.transaction.upsert({
      where: {
        txHash,
      },
      update: {},
      create: {
        userId: user.id,
        campaignId: campaign.id,
        txHash,
        type: "CAMPAIGN_CREATED",
        blockNumber,
      },
    });

    await tx.blockchainEvent.upsert({
      where: {
        txHash_logIndex: {
          txHash,
          logIndex,
        },
      },
      update: {
        processed: true,
      },
      create: {
        eventName: "CampaignCreated",
        txHash,
        blockNumber,
        logIndex,
        processed: true,
        payload: {
          campaignId: campaignId.toString(),
          creator,
          title,
          goal: goal.toString(),
          deadline: deadline.toString(),
        },
      },
    });
  });

  console.log(
    "✅ CampaignCreated fully synchronized:",
    campaignId.toString()
  );
}

export async function syncCampaignCreated(event) {
  try {
    await ensureCampaignCreated(event);
  } catch (error) {
    console.error(
      "❌ CampaignCreated sync error:",
      error
    );
  }
}

export async function syncContributionReceived(event) {
  const { campaignId, contributor, amount } = event.args;

  const txHash =
    event.transactionHash ?? event.log?.transactionHash;

  const blockNumber =
    event.blockNumber ?? event.log?.blockNumber;

  const logIndex =
    event.index ?? event.log?.index;

  const campaign = await prisma.campaign.findFirst({
    where: {
      contractCampaignId: campaignId.toString(),
    },
  });

  if (!campaign) {
    throw new Error(
      `Campaign ${campaignId.toString()} not found in database`
    );
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        wallet: contributor.toLowerCase(),
      },
      update: {},
      create: {
        wallet: contributor.toLowerCase(),
      },
    });

    const existingContribution =
      await tx.contribution.findUnique({
        where: {
          txHash,
        },
      });

    if (!existingContribution) {
      await tx.contribution.create({
        data: {
          campaignId: campaign.id,
          contributorId: user.id,
          amount: ethers.formatEther(amount),
          txHash,
          status: "CONFIRMED",
          blockNumber,
        },
      });

      const contributionAmount = ethers.formatEther(amount);

      const newRaisedAmount =
        Number(campaign.raisedAmount) + Number(contributionAmount);

      const newStatus =
        newRaisedAmount >= Number(campaign.goalAmount)
          ? "SUCCESSFUL"
          : campaign.status;

      await tx.campaign.update({
        where: {
          id: campaign.id,
        },
        data: {
          raisedAmount: {
            increment: contributionAmount,
          },
          status: newStatus,
        },
      });

      console.log(
        "✅ Contribution created:",
        txHash
      );
    }

    await tx.transaction.upsert({
      where: {
        txHash,
      },
      update: {},
      create: {
        userId: user.id,
        campaignId: campaign.id,
        txHash,
        type: "CONTRIBUTION",
        amount: ethers.formatEther(amount),
        blockNumber,
      },
    });

    await tx.blockchainEvent.upsert({
      where: {
        txHash_logIndex: {
          txHash,
          logIndex,
        },
      },
      update: {
        processed: true,
      },
      create: {
        eventName: "ContributionReceived",
        txHash,
        blockNumber,
        logIndex,
        processed: true,
        payload: {
          campaignId: campaignId.toString(),
          contributor,
          amount: amount.toString(),
        },
      },
    });
  });

  console.log(
    "✅ ContributionReceived fully synchronized:",
    campaignId.toString()
  );
}

export async function syncCampaignWithdrawn(event) {
  const { campaignId, creator, amount } = event.args;

  const txHash =
    event.transactionHash ?? event.log?.transactionHash;

  const blockNumber =
    event.blockNumber ?? event.log?.blockNumber;

  const logIndex =
    event.index ?? event.log?.index;

  const campaign = await prisma.campaign.findFirst({
    where: {
      contractCampaignId: campaignId.toString(),
    },
  });

  if (!campaign) {
    throw new Error(
      `Campaign ${campaignId.toString()} not found in database`
    );
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        wallet: creator.toLowerCase(),
      },
      update: {},
      create: {
        wallet: creator.toLowerCase(),
      },
    });

    await tx.campaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        status: "SUCCESSFUL",
      },
    });

    await tx.transaction.upsert({
      where: {
        txHash,
      },
      update: {},
      create: {
        userId: user.id,
        campaignId: campaign.id,
        txHash,
        type: "WITHDRAWAL",
        amount: ethers.formatEther(amount),
        blockNumber,
      },
    });

    await tx.blockchainEvent.upsert({
      where: {
        txHash_logIndex: {
          txHash,
          logIndex,
        },
      },
      update: {
        processed: true,
      },
      create: {
        eventName: "CampaignWithdrawn",
        txHash,
        blockNumber,
        logIndex,
        processed: true,
        payload: {
          campaignId: campaignId.toString(),
          creator,
          amount: amount.toString(),
        },
      },
    });
  });

  console.log(
    "✅ CampaignWithdrawn fully synchronized:",
    campaignId.toString()
  );
}

export async function syncRefundIssued(event) {
  const { campaignId, contributor, amount } = event.args;

  const txHash =
    event.transactionHash ?? event.log?.transactionHash;

  const blockNumber =
    event.blockNumber ?? event.log?.blockNumber;

  const logIndex =
    event.index ?? event.log?.index;

  const campaign = await prisma.campaign.findFirst({
    where: {
      contractCampaignId: campaignId.toString(),
    },
  });

  if (!campaign) {
    throw new Error(
      `Campaign ${campaignId.toString()} not found in database`
    );
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        wallet: contributor.toLowerCase(),
      },
      update: {},
      create: {
        wallet: contributor.toLowerCase(),
      },
    });

    const contribution = await tx.contribution.findFirst({
      where: {
        campaignId: campaign.id,
        contributorId: user.id,
        status: {
          in: ["CONFIRMED", "PENDING"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (contribution) {
      await tx.contribution.update({
        where: {
          id: contribution.id,
        },
        data: {
          status: "REFUNDED",
        },
      });
    }

    await tx.campaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        status: "FAILED",
      },
    });

    await tx.transaction.upsert({
      where: {
        txHash,
      },
      update: {},
      create: {
        userId: user.id,
        campaignId: campaign.id,
        txHash,
        type: "REFUND",
        amount: ethers.formatEther(amount),
        blockNumber,
      },
    });

    await tx.blockchainEvent.upsert({
      where: {
        txHash_logIndex: {
          txHash,
          logIndex,
        },
      },
      update: {
        processed: true,
      },
      create: {
        eventName: "RefundIssued",
        txHash,
        blockNumber,
        logIndex,
        processed: true,
        payload: {
          campaignId: campaignId.toString(),
          contributor,
          amount: amount.toString(),
        },
      },
    });
  });

  console.log(
    "✅ RefundIssued fully synchronized:",
    campaignId.toString()
  );
}

export function startBlockchainSync() {
  console.log("🔄 Blockchain sync started");

  contract.on("CampaignCreated", async (...args) => {
    const event = args[args.length - 1];
    await syncCampaignCreated(event);
  });

  contract.on("ContributionReceived", async (...args) => {
    const event = args[args.length - 1];
    await syncContributionReceived(event);
  });

  contract.on("CampaignWithdrawn", async (...args) => {
    const event = args[args.length - 1];
    await syncCampaignWithdrawn(event);
  });

  contract.on("RefundIssued", async (...args) => {
    const event = args[args.length - 1];
    await syncRefundIssued(event);
  });
}
