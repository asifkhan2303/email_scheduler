import IORedis from "ioredis";
import { env } from "./env";

export const redis = new IORedis({
  host: env.redisHost,
  port: env.redisPort,
  maxRetriesPerRequest: null
});

export const bullConnection = {
  host: env.redisHost,
  port: env.redisPort
};
