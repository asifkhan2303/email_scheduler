import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/** Parses "user1:pass1,user2:pass2" into a list of extra Ethereal accounts. */
function parseAccounts(raw?: string) {
  return (raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const index = entry.indexOf(":");
      return { user: entry.slice(0, index), password: entry.slice(index + 1) };
    })
    .filter((account) => account.user && account.password);
}

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: Number(process.env.REDIS_PORT || 6379),
  googleClientId: required("GOOGLE_CLIENT_ID"),
  jwtSecret: required("JWT_SECRET"),
  etherealHost: process.env.ETHEREAL_HOST || "smtp.ethereal.email",
  etherealPort: Number(process.env.ETHEREAL_PORT || 587),
  etherealUser: required("ETHEREAL_USER"),
  etherealPassword: required("ETHEREAL_PASSWORD"),
  emailFrom: process.env.EMAIL_FROM || process.env.ETHEREAL_USER || "",
  // Optional additional Ethereal senders: ETHEREAL_ACCOUNTS=user2:pass2,user3:pass3
  etherealExtraAccounts: parseAccounts(process.env.ETHEREAL_ACCOUNTS),
  workerConcurrency: Math.max(1, Number(process.env.WORKER_CONCURRENCY || 5)),
  // Minimum gap between two sends from the same sender (across all workers).
  minEmailDelayMs: Math.max(0, Number(process.env.MIN_EMAIL_DELAY_MS || 2000)),
  // Per-sender hourly cap (a campaign's own hourly limit can only lower it).
  maxEmailsPerHour: Math.max(1, Number(process.env.MAX_EMAILS_PER_HOUR || 200)),
  maxSendAttempts: Math.max(1, Number(process.env.MAX_SEND_ATTEMPTS || 3))
};
