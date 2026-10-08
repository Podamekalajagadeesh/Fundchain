import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import blockchainRouter from "./routes/blockchain.js";
import authRouter from "./routes/auth.js";
import campaignsRouter from "./routes/campaigns.js";
import { startBlockchainSync } from "./blockchain/sync.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/blockchain", blockchainRouter);
app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignsRouter);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "fundchain-api",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "FundChain API",
    version: "1.0.0",
    status: "running",
  });
});

startBlockchainSync();

app.listen(PORT, () => {
  console.log(`🚀 FundChain API running on http://localhost:${PORT}`);
});
