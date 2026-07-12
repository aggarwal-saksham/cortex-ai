import crypto from "crypto";

import { getAuth } from "firebase-admin/auth";
import User from "../models/user.model.js";
import redis from "../../../shared/redis/redis.js";
import { app } from "../config/firebase.js";

// Authenticates users using a Firebase ID token and starts a Redis-backed session
export const login = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify the client's Firebase token
    const decoded = await getAuth(app).verifyIdToken(token);

    console.log(decoded);

    // Find the user in the database or create a new profile
    let user = await User.findOne({
      firebaseUid: decoded.uid,
    });

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,

        email: decoded.email,

        name: decoded.name,

        avatar: decoded.picture,

        provider: decoded.firebase?.sign_in_provider,
      });
    }

    const sessionId = crypto.randomUUID();

    // Map user ID to active session ID in Redis
    await redis.set(
      `user-session:${user._id}`,
      sessionId,
      "EX",
      60 * 60 * 24 * 7,
    );

    // Cache the user's session profile in Redis
    await redis.set(
      `session:${sessionId}`,

      JSON.stringify({
        userId: user._id,

        email: user.email,
        avatar: user.avatar,
        name: user.name,
        plan: user.plan,
        credits: user.credits,
        totalCredits: user.totalCredits,
      }),

      "EX",

      60 * 60 * 24 * 7,
    );

    const isProd =
      process.env.NODE_ENV === "production" ||
      (process.env.FRONTEND_URL &&
        !process.env.FRONTEND_URL.includes("localhost"));

    // Set the HTTP-only cookie containing the session ID
    res.cookie(
      "session",

      sessionId,

      {
        httpOnly: true,

        secure: isProd,

        sameSite: isProd ? "none" : "lax",

        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    );

    return res.json({
      success: true,

      user,
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message,
    });
  }
};

// Deletes the user session from Redis and clears the browser cookie
export const logout = async (req, res) => {
  try {
    const sessionId = req.cookies?.session;

    if (sessionId) {
      await redis.del(`session:${sessionId}`);
    }

    const isProd =
      process.env.NODE_ENV === "production" ||
      (process.env.FRONTEND_URL &&
        !process.env.FRONTEND_URL.includes("localhost"));

    res.clearCookie("session", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,

      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// Updates the user subscription plan and refreshes their session cache
export const updatePlan = async (req, res) => {
  try {
    const {
      userId,

      plan,

      credits,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,

        message: "User not found",
      });
    }

    user.plan = plan;

    user.credits += credits;

    user.totalCredits += credits;

    user.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await user.save();

    const sessionId = await redis.get(`user-session:${user._id}`);

    // Update active Redis session if the user is currently logged in
    if (sessionId) {
      await redis.set(
        `session:${sessionId}`,

        JSON.stringify({
          userId: user._id,

          email: user.email,

          avatar: user.avatar,

          name: user.name,

          plan: user.plan,

          credits: user.credits,

          totalCredits: user.totalCredits,
        }),

        "EX",

        60 * 60 * 24 * 7,
      );
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// Deducts credits from the user account based on the requested agent type
export const deductCredits = async (req, res) => {
  try {
    const {
      userId,

      agent,
    } = req.body;

    // Credit cost definitions per agent invocation
    const COST = {
      chat: 1,

      search: 5,

      coding: 10,

      pdf: 10,

      ppt: 10,

      image: 10,
    };

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,

        message: "User not found",
      });
    }

    const requiredCredits = COST[agent] || 1;

    // Verify user has sufficient credit balance
    if (user.credits < requiredCredits) {
      return res.status(400).json({
        success: false,

        message: "Not enough credits.",
      });
    }

    user.credits -= requiredCredits;

    await user.save();

    const sessionId = await redis.get(`user-session:${user._id}`);

    // Update the active Redis session cache with the new credit balance
    if (sessionId) {
      await redis.set(
        `session:${sessionId}`,

        JSON.stringify({
          userId: user._id,

          email: user.email,

          avatar: user.avatar,

          name: user.name,

          plan: user.plan,

          credits: user.credits,

          totalCredits: user.totalCredits,
        }),

        "EX",

        60 * 60 * 24 * 7,
      );
    }

    return res.json({
      success: true,

      credits: user.credits,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
