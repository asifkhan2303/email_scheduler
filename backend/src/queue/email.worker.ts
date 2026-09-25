import { DelayedError, Job, Worker } from "bullmq";
import { bullConnection } from "../config/redis";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { EmailJobData } from "./email.queue";
import { sendEmail } from "../services/smtp.service";
import {
  releaseHourlySlot,
  reserveHourlySlot,
  reserveSendGap
} from "../services/rate-limit.service";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetries<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i >= attempts) throw error;
      await sleep(250 * i);
    }
  }
}

async function processEmail(job: Job<EmailJobData>, token?: string) {
  const { emailId } = job.data;

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { campaign: { select: { hourlyLimit: true } } }
  });

  // Idempotency guard #1: only a row that is still "scheduled" may be sent.
  // sent / failed / processing (another worker) / deleted rows are skipped.
  if (!email || email.status !== "scheduled") return;

  // Hourly limit (Redis counters, shared by every worker/instance).
  const rate = await reserveHourlySlot(email.sender, email.campaignId, email.campaign.hourlyLimit);

  if (!rate.allowed) {
    // Never drop the job: push it into the next window with free capacity.
    await prisma.email.update({ where: { id: emailId }, data: { scheduledTime: rate.retryAt } });
    await job.moveToDelayed(rate.retryAt.getTime(), token);
    throw new DelayedError();
  }

  // Idempotency guard #2: atomic claim. Only one worker can flip
  // scheduled -> processing, even if the same job is delivered twice.
  const claim = await prisma.email.updateMany({
    where: { id: emailId, status: "scheduled" },
    data: { status: "processing", attempts: { increment: 1 } }
  });

  if (claim.count === 0) {
    await releaseHourlySlot(email.sender, email.campaignId, rate.window);
    return;
  }

  // Minimum spacing between sends of the same sender, across all workers.
  const wait = await reserveSendGap(email.sender);
  if (wait > 0) await sleep(wait);

  let result: Awaited<ReturnType<typeof sendEmail>>;

  try {
    result = await sendEmail(email.sender, email.recipient, email.subject, email.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed";
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    await prisma.email.update({
      where: { id: emailId },
      data: isFinalAttempt
        ? { status: "failed", error: message, sentTime: new Date() }
        : { status: "scheduled", error: message } // let BullMQ retry it
    });

    throw error;
  }

  // The SMTP server accepted the message: record it (retrying the DB write so
  // a brief DB hiccup does not leave a delivered email in "processing").
  await withRetries(() =>
    prisma.email.update({
      where: { id: emailId },
      data: {
        status: "sent",
        sentTime: new Date(),
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        error: null
      }
    })
  );
}

export const worker = new Worker<EmailJobData>("email-queue", processEmail, {
  connection: bullConnection,
  concurrency: env.workerConcurrency
});

worker.on("completed", (job) => {
  console.log(`Email job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Email job failed: ${job?.id}`, error.message);
});

worker.on("error", (error) => {
  console.error("Worker error", error.message);
});
