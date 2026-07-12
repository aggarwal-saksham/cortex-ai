import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/supervisor.graph.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";

// Process incoming user prompt and invoke the agent graph
export const chat = async (req, res, next) => {
  try {
    const {
      prompt,

      conversationId,

      agent,
    } = req.body;

    console.log(req.body);
    console.log(req.file);

    // Save the user's message in local cache memory
    await addMessage(conversationId, "user", prompt);

    // Save the user's message in the database via the chat service
    await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: "user",
      content: prompt,
    });

    // Run the multi-agent graph with the user's prompt and file inputs
    const result = await graph.invoke({
      prompt,

      conversationId,

      userId: req.headers["x-user-id"],
      agent,
      file: req.file,
    });

    console.log("after res", result);

    // Save the assistant's response in local cache memory
    await addMessage(conversationId, "assistant", result.response);
    
    // Save the assistant's response and generated assets in the database
    await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: "assistant",
      content: result.response,
      images: result.images,
      artifacts: result.artifacts || [],
    });

    return res.json({
      success: true,

      answer: result.response,
      images: result.images,
      artifacts: result.artifacts || [],
    });
  } catch (error) {
    // Forward the error to the global error middleware
    next(error);
  }
};
