import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { AuthRequest } from "../middleware/auth.middleware";
import { enqueueEmails, removeEmailJob } from "../queue/email.queue";
import { findSender, listSenderAddresses, pickSender, ROTATE, senders } from "../services/sender.service";
import { htmlToText, makePreview } from "../utils/html";
import { parseRecipients } from "../utils/email-parser";

const MAX_RECIPIENTS = 20000;
const MAX_LIST_LIMIT = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const SCHEDULED_STATUSES = ["scheduled", "processing"];
const SENT_STATUSES = ["sent", "failed"];

function readRecipients(raw: unknown): string[] {
  let input: unknown = raw;

  if (typeof raw === "string") {
    try {
      input = JSON.parse(raw);
    } catch {
      input = raw;
    }
  }

  return parseRecipients(Array.isArray(input) ? input.join("\n") : String(input ?? ""));
}

export async function scheduleEmails(req: AuthRequest, res: Response) {
  try {
    const { subject, body, startTime, delay, hourlyLimit, recipients, sender } = req.body ?? {};

    if (!subject || !body || !startTime) {
      return res.status(400).json({ error: "subject, body and startTime are required" });
    }

    if (String(subject).length > 255) {
      return res.status(400).json({ error: "Subject must be 255 characters or fewer" });
    }

    if (!htmlToText(String(body))) {
      return res.status(400).json({ error: "Email body cannot be empty" });
    }

    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "startTime must be a valid date" });
    }

    const parsedRecipients = readRecipients(recipients);

    if (!parsedRecipients.length) {
      return res.status(400).json({ error: "No valid recipients found" });
    }

    if (parsedRecipients.length > MAX_RECIPIENTS) {
      return res.status(400).json({ error: `A campaign can have at most ${MAX_RECIPIENTS} recipients` });
    }

    const senderChoice = sender ? String(sender) : senders[0].address;
    if (senderChoice !== ROTATE && !findSender(senderChoice)) {
      return res.status(400).json({ error: "Unknown sender" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(401).json({ error: "User not found" });

    const delayMs = Math.min(DAY_MS, Math.max(0, Number(delay ?? 2000) || 0));
    const limit = Math.max(1, Math.floor(Number(hourlyLimit) || env.maxEmailsPerHour));

    // A start time in the past simply means "send as soon as possible".
    const firstSend = new Date(Math.max(start.getTime(), Date.now()));

    const campaignId = randomUUID();
    const subjectText = String(subject).trim();
    const bodyText = String(body);

    const emails = parsedRecipients.map((recipient, index) => ({
      id: randomUUID(),
      campaignId,
      recipient,
      sender: pickSender(senderChoice, index),
      subject: subjectText,
      body: bodyText,
      scheduledTime: new Date(firstSend.getTime() + index * delayMs)
    }));

    // Keep each INSERT well below MySQL's max_allowed_packet.
    const chunkSize = Math.max(25, Math.min(1000, Math.floor(2_000_000 / (bodyText.length + 500))));
    const inserts: Prisma.PrismaPromise<unknown>[] = [
      prisma.campaign.create({
        data: {
          id: campaignId,
          userId: user.id,
          subject: subjectText,
          body: bodyText,
          sender: senderChoice,
          startTime: firstSend,
          delayMs,
          hourlyLimit: limit
        }
      })
    ];

    for (let i = 0; i < emails.length; i += chunkSize) {
      inserts.push(prisma.email.createMany({ data: emails.slice(i, i + chunkSize) }));
    }

    // Campaign + every email row are written atomically (source of truth first).
    await prisma.$transaction(inserts);

    try {
      // Only pushes delayed jobs into Redis; the worker does the sending later,
      // so the response never waits on SMTP even for thousands of recipients.
      await enqueueEmails(emails);
    } catch (error) {
      // Nothing is queued: remove the rows so the user is not left with emails
      // that look scheduled but never send.
      await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => undefined);
      throw error;
    }

    return res.status(201).json({
      campaignId,
      totalRecipients: emails.length,
      firstScheduledTime: emails[0].scheduledTime.toISOString(),
      lastScheduledTime: emails[emails.length - 1].scheduledTime.toISOString()
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to schedule emails" });
  }
}

function listQuery(req: AuthRequest, statuses: string[]) {
  const q = String(req.query.q ?? "").trim();
  const status = String(req.query.status ?? "");
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const where: Prisma.EmailWhereInput = {
    campaign: { userId: req.userId! },
    status: { in: statuses.includes(status) ? [status] : statuses },
    ...(q ? { OR: [{ recipient: { contains: q } }, { subject: { contains: q } }] } : {})
  };

  return { where, limit, offset };
}

type ListRow = Prisma.EmailGetPayload<{}>;

function serialize(email: ListRow) {
  return {
    id: email.id,
    campaign_id: email.campaignId,
    recipient: email.recipient,
    sender: email.sender,
    subject: email.subject,
    preview: makePreview(email.body),
    status: email.status,
    scheduled_time: email.scheduledTime.toISOString(),
    sent_time: email.sentTime?.toISOString() ?? null,
    error: email.error
  };
}

export async function getScheduled(req: AuthRequest, res: Response) {
  const { where, limit, offset } = listQuery(req, SCHEDULED_STATUSES);

  const [emails, total] = await Promise.all([
    prisma.email.findMany({ where, orderBy: [{ scheduledTime: "asc" }, { id: "asc" }], take: limit, skip: offset }),
    prisma.email.count({ where })
  ]);

  return res.json({ emails: emails.map(serialize), total });
}

export async function getSent(req: AuthRequest, res: Response) {
  const { where, limit, offset } = listQuery(req, SENT_STATUSES);

  const [emails, total] = await Promise.all([
    prisma.email.findMany({ where, orderBy: [{ sentTime: "desc" }, { id: "asc" }], take: limit, skip: offset }),
    prisma.email.count({ where })
  ]);

  return res.json({ emails: emails.map(serialize), total });
}

export async function getStats(req: AuthRequest, res: Response) {
  const owner = { campaign: { userId: req.userId! } };

  const [scheduled, sent] = await Promise.all([
    prisma.email.count({ where: { ...owner, status: { in: SCHEDULED_STATUSES } } }),
    prisma.email.count({ where: { ...owner, status: { in: SENT_STATUSES } } })
  ]);

  return res.json({ scheduled, sent });
}

export function getSenders(_req: AuthRequest, res: Response) {
  return res.json({ senders: listSenderAddresses() });
}

export async function getEmail(req: AuthRequest, res: Response) {
  const email = await prisma.email.findFirst({
    where: { id: String(req.params.id), campaign: { userId: req.userId! } }
  });

  if (!email) return res.status(404).json({ error: "Email not found" });

  return res.json({
    email: {
      ...serialize(email),
      body: email.body,
      attempts: email.attempts,
      preview_url: email.previewUrl
    }
  });
}

export async function cancelScheduled(req: AuthRequest, res: Response) {
  const id = String(req.params.id);

  // Only rows still waiting in the queue can be cancelled. If a worker has
  // already claimed the row the delete matches nothing and we report a conflict.
  const deleted = await prisma.email.deleteMany({
    where: { id, status: "scheduled", campaign: { userId: req.userId! } }
  });

  if (deleted.count === 0) {
    const exists = await prisma.email.findFirst({ where: { id, campaign: { userId: req.userId! } } });
    return exists
      ? res.status(409).json({ error: "This email is already being sent or has been sent" })
      : res.status(404).json({ error: "Email not found" });
  }

  await removeEmailJob(id);

  return res.json({ ok: true });
}
