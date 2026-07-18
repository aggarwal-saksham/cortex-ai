import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { searchTool } from "../utils/tavily.js";

export const searchAgent = async (state) => {
  await checkAgentLimit(state.userId, "search");
  await deductCredits(
    state.userId,

    "search",
  );
  try {
    const results = await searchTool.invoke({
      query: state.prompt,
    });

    console.log(results);

    return {
      ...state,

      searchResults: results,
    };
  } catch (error) {
    if (error.status === 429) throw error;
    console.log("Search Agent Error:", error);

    return {
      ...state,

      searchResults: [],
    };
  }
};
