import "dotenv/config";
import { contract } from "../src/blockchain/contract.js";
import { syncCampaignCreated } from "../src/blockchain/sync.js";

const blockNumber = 11864381;

const events = await contract.queryFilter(
  contract.filters.CampaignCreated(),
  blockNumber,
  blockNumber
);

console.log(`Found ${events.length} CampaignCreated event(s)`);

for (const event of events) {
  console.log(
    `Backfilling campaign ${event.args.campaignId.toString()}...`
  );

  await syncCampaignCreated(event);
}

console.log("✅ Backfill complete");
process.exit(0);
