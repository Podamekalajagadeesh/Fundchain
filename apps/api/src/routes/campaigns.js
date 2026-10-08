import express from "express";
import prisma from "../database/prisma.js";
import { requireAuth } from "../auth/middleware.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        creator: {
          select: {
            wallet: true,
          },
        },
      },
    });

    res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Campaign listing error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to load campaigns",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        creator: {
          select: {
            wallet: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    res.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Campaign lookup error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to load campaign",
    });
  }
});

router.get("/mine/list", requireAuth, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        creatorId: req.user.sub,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("User campaigns error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to load your campaigns",
    });
  }
});

export default router;
