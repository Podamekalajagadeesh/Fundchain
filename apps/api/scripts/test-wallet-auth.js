import "dotenv/config";
import { ethers } from "ethers";

const wallet = new ethers.Wallet(process.env.AUTH_TEST_PRIVATE_KEY);

const response = await fetch("http://localhost:4000/api/auth/nonce", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    wallet: wallet.address,
  }),
});

const challenge = await response.json();

if (!challenge.success) {
  throw new Error(JSON.stringify(challenge));
}

console.log("Wallet:", wallet.address);
console.log("Challenge received");

const signature = await wallet.signMessage(challenge.message);

console.log("Signature created");

const verifyResponse = await fetch(
  "http://localhost:4000/api/auth/verify",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      wallet: wallet.address,
      message: challenge.message,
      signature,
    }),
  }
);

const result = await verifyResponse.json();

console.log(JSON.stringify(result, null, 2));

if (!result.success) {
  process.exit(1);
}

console.log("✅ Wallet authentication successful");
console.log("JWT received");
