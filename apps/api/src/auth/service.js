import "dotenv/config";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import prisma from "../database/prisma.js";

const NONCE_TTL_MS = 10 * 60 * 1000;

function normalizeWallet(wallet) {
  if (!ethers.isAddress(wallet)) {
    throw new Error("Invalid wallet address");
  }

  return wallet.toLowerCase();
}

function createMessage(wallet, nonce, issuedAt, expiresAt) {
  return [
    "FundChain Authentication",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration: ${expiresAt}`,
    `Chain ID: ${process.env.BLOCKCHAIN_CHAIN_ID}`,
  ].join("\n");
}

export async function createNonce(wallet) {
  wallet = normalizeWallet(wallet);

  const nonce = crypto.randomBytes(32).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);

  const user = await prisma.user.upsert({
    where: {
      wallet,
    },
    update: {
      authNonce: nonce,
      authNonceExpires: expiresAt,
    },
    create: {
      wallet,
      authNonce: nonce,
      authNonceExpires: expiresAt,
    },
  });

  const message = createMessage(
    wallet,
    nonce,
    issuedAt.toISOString(),
    expiresAt.toISOString()
  );

  return {
    userId: user.id,
    wallet,
    message,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyWalletSignature(
  wallet,
  message,
  signature
) {
  wallet = normalizeWallet(wallet);

  const user = await prisma.user.findUnique({
    where: {
      wallet,
    },
  });

  if (!user || !user.authNonce || !user.authNonceExpires) {
    throw new Error("Authentication challenge not found");
  }

  if (user.authNonceExpires.getTime() < Date.now()) {
    throw new Error("Authentication challenge expired");
  }

  const recoveredAddress = ethers.verifyMessage(
    message,
    signature
  );

  if (recoveredAddress.toLowerCase() !== wallet) {
    throw new Error("Invalid wallet signature");
  }

  if (!message.includes(`Wallet: ${wallet}`)) {
    throw new Error("Invalid authentication message");
  }

  if (!message.includes(`Nonce: ${user.authNonce}`)) {
    throw new Error("Invalid authentication nonce");
  }

  const token = jwt.sign(
    {
      sub: user.id,
      wallet: user.wallet,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: "fundchain-api",
      audience: "fundchain",
    }
  );

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      authNonce: null,
      authNonceExpires: null,
    },
  });

  return {
    token,
    user: {
      id: user.id,
      wallet: user.wallet,
      role: user.role,
    },
  };
}

export function verifyAccessToken(token) {
  return jwt.verify(
    token,
    process.env.JWT_SECRET,
    {
      issuer: "fundchain-api",
      audience: "fundchain",
    }
  );
}
