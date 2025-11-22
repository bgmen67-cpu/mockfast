import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://mock-url.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock-token',
});

// Create a new ratelimiter that allows 5 requests per 10 seconds
export const freeTierRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});