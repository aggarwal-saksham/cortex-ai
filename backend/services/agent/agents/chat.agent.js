import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { getMemory } from "../utils/memory.js";
import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";

export const chatAgent = async (state) => {
  await checkAgentLimit(state.userId, "chat");

  await deductCredits(
    state.userId,

    "chat",
  );

  const llm = getModel("chat");

  const history = await getMemory(state.conversationId);

  const searchResultsText = typeof state.searchResults === "string"
    ? state.searchResults
    : (state.searchResults?.results
        ? state.searchResults.results.map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join("\n\n")
        : JSON.stringify(state.searchResults, null, 2));

  const searchContext = state.searchResults
    ? `
Web Search Results:

${searchResultsText}

Use the search results to provide a comprehensive, accurate, and up-to-date response. Do not refuse to answer or say you cannot answer if the details can be synthesized from the search results.
`
    : "";

  const messages = [
    new SystemMessage(
      `
You are CortexAI, an intelligent AI assistant.

${searchContext}



If searchContext exists:

- Use the provided search results to answer the question.
- If the search results do not explicitly contain the answer, you can supplement it using your pre-trained knowledge or inform the user based on the context.
- Do not mention internal tools.

Rules:

- For simple questions, greetings, and short queries, respond naturally in plain text.
- For technical, educational, coding, or detailed topics, use clean Markdown.

Formatting:

- Use # for titles and ## for sections.
- Leave a blank line after headings.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for code.
- Keep paragraphs short and readable.
- Never write headings and content on the same line.
- Never generate large walls of text.




`,
    ),
  ];

  history.forEach((msg) => {
    if (msg.role === "user") {
      messages.push(new HumanMessage(msg.content));
    }

    if (msg.role === "assistant") {
      messages.push(new AIMessage(msg.content));
    }
  });

  messages.push(new HumanMessage(state.prompt));

  const response = await llm.invoke(messages);

  const images = state.searchResults?.images || [];

  return {
    ...state,

    response: response.content,
    images: images,
  };
};
