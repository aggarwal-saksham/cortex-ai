import redis from "../../shared/redis/redis.js";

// Middleware to verify session cookies and authenticate requests
export const protect = async (req, res, next) => {
  try {
    const sessionId = req?.cookies?.session;

    if (!sessionId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // Look up the active session in Redis cache
    const session = await redis.get(`session:${sessionId}`);

    if (!session) {
      return res.status(401).json({
        message: "Session Expired",
      });
    }

    req.user = JSON.parse(session);

    next();
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
