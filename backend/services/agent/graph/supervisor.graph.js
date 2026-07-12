import { StateGraph } from "@langchain/langgraph";

import { AgentState } from "./state.js";

import { routerNode } from "./router.node.js";

import { chatAgent } from "../agents/chat.agent.js";

import { codingAgent } from "../agents/coding.agent.js";

import { searchAgent } from "../agents/search.agent.js";

import { pdfAgent } from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { imageAgent } from "../agents/imageGen.agent.js";
import { visionAgent } from "../agents/vision.agent.js";
import { pdfRagAgent } from "../agents/pdfRag.agent.js";

// Initialize a state graph utilizing our custom agent state schema
const workflow = new StateGraph(AgentState);

// Define the functional nodes in the routing workflow
workflow.addNode("router", routerNode);

workflow.addNode("chat", chatAgent);

workflow.addNode("coding", codingAgent);

workflow.addNode("search", searchAgent);

workflow.addNode("pdf", pdfAgent);
workflow.addNode("ppt", pptAgent);
workflow.addNode("image", imageAgent);
workflow.addNode("vision", visionAgent);
workflow.addNode("pdf_rag", pdfRagAgent);

// Point the starting edge to the router node
workflow.addEdge("__start__", "router");

// Route query execution dynamically from the router to the matched agent node
workflow.addConditionalEdges(
  "router",

  (state) => {
    switch (state.agent) {
      case "search":
        return "search";

      case "coding":
        return "coding";

      case "pdf":
        return "pdf";

      case "ppt":
        return "ppt";

      case "image":
        return "image";

      case "vision":
        return "vision";
      case "pdf_rag":
        return "pdf_rag";

      default:
        return "chat";
    }
  },

  {
    chat: "chat",

    search: "search",

    coding: "coding",

    pdf: "pdf",
    ppt: "ppt",
    image: "image",
    vision: "vision",
    pdf_rag: "pdf_rag",
  },
);

// End states for specialized creation/generation pipelines
workflow.addEdge("coding", "__end__");
workflow.addEdge("image", "__end__");

// Route web search results back to the chat agent to compose the final response
workflow.addEdge("search", "chat");

workflow.addEdge("pdf", "__end__");
workflow.addEdge("ppt", "__end__");

workflow.addEdge("chat", "__end__");

workflow.addEdge("vision", "__end__");

workflow.addEdge("pdf_rag", "__end__");

// Compile the state graph workflow into an executable LangGraph instance
export const graph = workflow.compile();
