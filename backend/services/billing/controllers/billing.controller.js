import razorpay from "../config/razorpay.js";
import { PLANS } from "../config/plans.js";
import Payment from "../models/payment.model.js";
import crypto from "crypto";

import axios from "axios";

// Creates a Razorpay order and logs the pending payment record in the database
export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    const userId = req.headers["x-user-id"];

    const selectedPlan = PLANS[plan];

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,

        message: "Invalid plan",
      });
    }

    // Call Razorpay API to generate a unique order
    const order = await razorpay.orders.create({
      amount: selectedPlan.amount * 100, // Razorpay processes amounts in paisa (sub-units)

      currency: "INR",

      receipt: `receipt_${Date.now()}`,
    });

    // Create a pending payment log in MongoDB
    await Payment.create({
      userId,

      orderId: order.id,

      amount: selectedPlan.amount,

      credits: selectedPlan.credits,

      plan: selectedPlan.id,

      currency: order.currency,

      status: "created",
    });

    return res.json({
      success: true,

      order,

      plan: selectedPlan,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// Verifies the signature sent by Razorpay and increments user plan/credits on success
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,

      razorpay_payment_id,

      razorpay_signature,
    } = req.body;

    // Verify signature using HMAC SHA256 encryption
    const generatedSignature = crypto

      .createHmac(
        "sha256",

        process.env.RAZORPAY_KEY_SECRET,
      )

      .update(`${razorpay_order_id}|${razorpay_payment_id}`)

      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,

        message: "Payment verification failed",
      });
    }

    const payment = await Payment.findOne({
      orderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,

        message: "Payment not found",
      });
    }

    payment.status = "paid";

    payment.paymentId = razorpay_payment_id;

    await payment.save();

    // Call the Auth microservice internally to update user plan and add credits
    await axios.patch(
      `${process.env.AUTH_SERVICE}/internal/update-plan`,

      {
        userId: payment.userId,

        plan: payment.plan,

        credits: payment.credits,
      },
    );

    return res.json({
      success: true,

      message: "Payment verified successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
