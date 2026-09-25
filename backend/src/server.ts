import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";
import { redis } from "./config/redis";
import { emailQueue } from "./queue/email.queue";
import { worker } from "./queue/email.worker";
import { recoverInterruptedWork } from "./queue/recovery";

redis.on("error", (error) => console.error("Redis error", error.message));

async function main() {
  await recoverInterruptedWork();

  const server = app.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
    console.log(
      `Worker: concurrency=${env.workerConcurrency}, min gap=${env.minEmailDelayMs}ms, max ${env.maxEmailsPerHour}/hour per sender`
    );
  });

  // Graceful stop: let in-flight sends finish, leave delayed jobs in Redis.
  let stopping = false;
  async function shutdown(signal: string) {
    if (stopping) return;
    stopping = true;
    console.log(`${signal} received, shutting down...`);

    server.close();
    await worker.close();
    await emailQueue.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
