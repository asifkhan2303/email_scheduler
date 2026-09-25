import { redis } from "../config/redis";
import { env } from "../config/env";

const HOUR_MS = 60 * 60 * 1000;
const KEY_TTL_SECONDS = 2 * 60 * 60;

/**
 * Atomically checks + increments the per-sender and per-campaign hourly
 * counters. Nothing is incremented unless BOTH are under their limit, so two
 * workers can never both squeeze past the cap.
 *
 * When a limit is hit, an "overflow" counter tells us how many jobs were
 * already turned away in this window, which lets us push the job straight
 * into the right future window (limit jobs per window) instead of bouncing
 * every job to "next hour" again and again.
 *
 * Returns { 1, 0 } when allowed, or { 0, windowsAhead } when denied.
 */
const HOURLY_SCRIPT = `
local senderLimit = tonumber(ARGV[1])
local campaignLimit = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local sent = tonumber(redis.call('GET', KEYS[1]) or '0')
local campaign = tonumber(redis.call('GET', KEYS[2]) or '0')

local function overflow(overKey, limit)
  local over = redis.call('INCR', overKey)
  redis.call('EXPIRE', overKey, ttl)
  return math.floor((over - 1) / limit) + 1
end

if sent >= senderLimit then return {0, overflow(KEYS[3], senderLimit)} end
if campaign >= campaignLimit then return {0, overflow(KEYS[4], campaignLimit)} end

redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ttl)
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], ttl)
return {1, 0}
`;

/**
 * Hands out send slots at least `gap` ms apart per sender, shared by every
 * worker/instance. Returns how long the caller must wait before sending.
 */
const GAP_SCRIPT = `
local now = tonumber(ARGV[1])
local gap = tonumber(ARGV[2])
local nextSlot = tonumber(redis.call('GET', KEYS[1]) or '0')
if nextSlot < now then nextSlot = now end
redis.call('SET', KEYS[1], nextSlot + gap, 'PX', (nextSlot - now) + gap + 60000)
return nextSlot - now
`;

const senderKey = (sender: string, window: number) => `rate:sender:${sender}:${window}`;
const campaignKey = (campaignId: string, window: number) => `rate:campaign:${campaignId}:${window}`;

export type HourlyReservation =
  | { allowed: true; window: number }
  | { allowed: false; retryAt: Date };

export async function reserveHourlySlot(
  sender: string,
  campaignId: string,
  campaignLimit: number,
  now = Date.now()
): Promise<HourlyReservation> {
  const window = Math.floor(now / HOUR_MS);

  const [allowed, windowsAhead] = (await redis.eval(
    HOURLY_SCRIPT,
    4,
    senderKey(sender, window),
    campaignKey(campaignId, window),
    `${senderKey(sender, window)}:over`,
    `${campaignKey(campaignId, window)}:over`,
    env.maxEmailsPerHour,
    Math.max(1, campaignLimit),
    KEY_TTL_SECONDS
  )) as [number, number];

  if (allowed === 1) return { allowed: true, window };

  return {
    allowed: false,
    retryAt: new Date((window + Math.max(1, windowsAhead)) * HOUR_MS)
  };
}

/** Gives a reserved hourly slot back (used when the email was not actually sent). */
export async function releaseHourlySlot(sender: string, campaignId: string, window: number) {
  await redis
    .multi()
    .decr(senderKey(sender, window))
    .decr(campaignKey(campaignId, window))
    .exec();
}

export async function reserveSendGap(sender: string, gapMs = env.minEmailDelayMs): Promise<number> {
  if (gapMs <= 0) return 0;

  const wait = await redis.eval(GAP_SCRIPT, 1, `rate:gap:${sender}`, Date.now(), gapMs);
  return Number(wait);
}
