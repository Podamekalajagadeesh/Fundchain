import express from "express";
import {
  getCampaignCount,
  getCampaign,
  getContribution,
  isSuccessful,
  isFailed,
  getRemainingAmount,
} from "../blockchain/service.js";

const router = express.Router();

router.get("/campaigns/count", async (req, res) => {
  try {
    const count = await getCampaignCount();

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Blockchain error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to read campaign count",
    });
  }
});

router.get("/campaigns/:id", async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id);

    res.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Blockchain error:", error);

    res.status(404).json({
      success: false,
      error: "Campaign not found",
    });
  }
});

router.get("/campaigns/:id/contribution/:address", async (req, res) => {
  try {
    const amount = await getContribution(
      req.params.id,
      req.params.address
    );

    res.json({
      success: true,
      amount,
    });
  } catch (error) {
    console.error("Blockchain error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to read contribution",
    });
  }
});

router.get("/campaigns/:id/status", async (req, res) => {
  try {
    const campaignId = req.params.id;

    const [successful, failed, remaining] = await Promise.all([
      isSuccessful(campaignId),
      isFailed(campaignId),
      getRemainingAmount(campaignId),
    ]);

    res.json({
      success: true,
      successful,
      failed,
      remaining,
    });
  } catch (error) {
    console.error("Blockchain error:", error);

    res.status(404).json({
      success: false,
      error: "Campaign not found",
    });
  }
});

export default router;
