import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 00:00 UTC (07:00 WIB) to clean up old resolved requests
crons.daily(
  "cleanup-old-stock-requests",
  { hourUTC: 0, minuteUTC: 0 },
  internal.stockRequests.cleanupOldRequests
);

export default crons;
