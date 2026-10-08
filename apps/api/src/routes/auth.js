import express from "express";
import prisma from "../database/prisma.js";
import {
  createNonce,
  verifyWalletSignature,
} from "../auth/service.js";
import { requireAuth } from "../auth/middleware.js";

const router = express.Router();

router.post("/nonce", async (req, res) => {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: "Wallet address is required",
      });
    }

    const result = await createNonce(wallet);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Nonce error:", error);

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const {
      wallet,
      message,
      signature,
    } = req.body;

    if (!wallet || !message || !signature) {
      return res.status(400).json({
        success: false,
        error: "wallet, message and signature are required",
      });
    }

    const result = await verifyWalletSignature(
      wallet,
      message,
      signature
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Signature verification error:", error);

    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.sub,
      },
      select: {
        id: true,
        wallet: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("User lookup error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to load user",
    });
  }
});

export default router;
