import axios from "axios";

// Calls the Auth microservice internally to deduct credit points based on the triggered agent
export const deductCredits = async (
  userId,

  agent,
) => {
  try {
    // Send a patch request to auth service to check and deduct credits
    await axios.patch(
      `${process.env.AUTH_SERVICE}/internal/deduct-credits`,

      {
        userId,

        agent,
      },
    );
  } catch (error) {
    const response = error.response?.data;

    // Construct a descriptive error to prompt the user about credit exhaustion
    const err = new Error(response?.message || "Failed to deduct credits.");

    err.status = error.response?.status || 500;

    err.data = {
      success: false,

      title: response?.title || "Insufficient Credits",

      message:
        response?.message ||
        "You don't have enough credits. Please upgrade your plan.",
    };

    throw err;
  }
};
