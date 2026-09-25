import { JobsOptions, Queue } from "bullmq";
import { bullConnection } from "../config/redis";
import { env } from "../config/env";

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData>("email-queue", {
  connection: bullConnection
});

emailQueue.on("error", (error) => {
  console.error("Queue error", error.message);
});

function jobOptions(scheduledTime: Date): JobsOptions {
  return {
    // The DB row id doubles as the BullMQ job id: adding the same email twice
    // is a no-op, which is what makes (re-)enqueueing idempotent.
    delay: Math.max(0, scheduledTime.getTime() - Date.now()),
    attempts: env.maxSendAttempts,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 24 * 60 * 60 },
    removeOnFail: { age: 7 * 24 * 60 * 60 }
  };
}

export async function enqueueEmail(emailId: string, scheduledTime: Date) {
  await emailQueue.add("send-email", { emailId }, { ...jobOptions(scheduledTime), jobId: emailId });
}

/** Enqueues many emails with a handful of Redis round trips. */
export async function enqueueEmails(emails: { id: string; scheduledTime: Date }[], chunkSize = 500) {
  for (let i = 0; i < emails.length; i += chunkSize) {
    await emailQueue.addBulk(
      emails.slice(i, i + chunkSize).map((email) => ({
        name: "send-email",
        data: { emailId: email.id },
        opts: { ...jobOptions(email.scheduledTime), jobId: email.id }
      }))
    );
  }
}

export async function removeEmailJob(emailId: string) {
  const job = await emailQueue.getJob(emailId);
  if (job) await job.remove().catch(() => undefined);
}
