import redis from "../../../shared/redis/redis.js";

// Max requests allowed per user per minute for each agent type
const LIMITS = {
  chat: 20,
  coding: 5,
  pdf: 5,
  ppt: 5,
  image: 3,
  search: 5,
};

// Uses a Redis counter to implement a 1-minute rolling rate limit for a user
export const checkAgentLimit = async (userId, agent) => {
  const max = LIMITS[agent] ?? LIMITS.chat;

  const key = `rate:${agent}:${userId}`;

  // Increment current request count for the user
  const count = await redis.incr(key);

  // Set counter expiry duration to 60 seconds on the first request
  if (count === 1) {
    await redis.expire(key, 60);
  }

  const ttl = await redis.ttl(key);

  // If request limit is crossed, calculate the remaining cooling time and throw 429
  if (count > max) {
    const minutes = Math.floor(ttl / 60);
    const seconds = ttl % 60;

    const time = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const error = new Error(`Rate limit exceeded for ${agent}.`);

    error.status = 429;

    error.data = {
      success: false,
      agent,
      limit: max,
      remainingTime: ttl,
      retryAfter: time,
      message: `You have reached the ${agent} limit (${max} requests/minute). Try again in ${time}.`,
    };

    throw error;
  }

  return {
    remaining: max - count,
    limit: max,
  };
};
