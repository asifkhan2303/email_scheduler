import { prisma } from "../config/db";
import { emailQueue, enqueueEmails } from "./email.queue";

const BATCH = 500;

/**
 * Runs once on boot. BullMQ already keeps delayed jobs in Redis, so a normal
 * restart needs nothing. This only repairs the two rare cases where the DB
 * and Redis disagree:
 *
 * 1. Rows stuck in "processing": the process died while sending. We cannot
 *    know whether the SMTP server accepted the message, so we prefer "never
 *    send twice" over "maybe lose one" and mark them failed with a clear error.
 *    (If another live instance is genuinely mid-send it will still overwrite
 *    the row with "sent" when it finishes.)
 * 2. "scheduled" rows without a BullMQ job (e.g. Redis was flushed, or the
 *    API crashed between the DB write and the enqueue). They are re-added
 *    with jobId = email id, so an existing job is never duplicated.
 */
export async function recoverInterruptedWork() {
  const interrupted = await prisma.email.updateMany({
    where: { status: "processing" },
    data: {
      status: "failed",
      sentTime: new Date(),
      error: "Interrupted while sending (server stopped). Not retried automatically to avoid a duplicate send."
    }
  });

  let requeued = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.email.findMany({
      where: { status: "scheduled" },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, scheduledTime: true }
    });

    if (!rows.length) break;

    const missing = [];
    for (const row of rows) {
      if (!(await emailQueue.getJob(row.id))) missing.push(row);
    }

    await enqueueEmails(missing);
    requeued += missing.length;
    cursor = rows[rows.length - 1].id;
  }

  console.log(
    `Recovery: ${interrupted.count} interrupted email(s) marked failed, ${requeued} missing job(s) re-queued`
  );
}
