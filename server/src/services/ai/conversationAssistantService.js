const {
  generateConversationResponse,
  AiError,
  getConfig,
} = require("./aiProvider");
const { buildProjectContext } = require("./projectContextBuilder");
const { buildConversationAssistantPrompt } = require("./promptBuilder");
const { vectorStore } = require("../rag/vectorStore");
const { generateQueryEmbedding } = require("../rag/embeddingService");

const CONVERSATION_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["project", "task", "bug", "document"] },
          label: { type: "string" },
          excerpt: { type: "string" },
        },
        required: ["type", "label"],
      },
    },
  },
  required: ["answer", "confidence", "sources"],
};

const MAX_MESSAGE_LENGTH = 4000;

const validateUserMessage = (text) => {
  if (typeof text !== "string") {
    return { valid: false, error: "Message must be a string", code: "INVALID_MESSAGE" };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, error: "Message cannot be empty", code: "MESSAGE_REQUIRED" };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      code: "MESSAGE_TOO_LARGE",
    };
  }

  return { valid: true, data: trimmed };
};

const logUsage = (record) => {
  console.log(`[ai] ${JSON.stringify(record)}`);
};

const generateConversationReply = async ({
  project = null,
  tasks = [],
  bugs = [],
  priorMessages = [],
  currentUserMessage = "",
  retrievedChunks = null,
} = {}) => {
  const startedAt = Date.now();
  const { provider, model } = getConfig();

  // 1. Build context if a project is associated
  let projectContext = null;
  if (project) {
    projectContext = buildProjectContext({ project, tasks, bugs });
  }

  // 2. Perform RAG vector retrieval if project is present and chunks not pre-supplied
  let activeChunks = retrievedChunks;
  if (!activeChunks && project && currentUserMessage) {
    try {
      const queryEmbedding = await generateQueryEmbedding(currentUserMessage);
      activeChunks = await vectorStore.searchSimilarChunks({
        projectId: project._id,
        queryEmbedding,
        topK: 5,
        minScore: 0.2,
      });
    } catch (err) {
      console.warn(`[rag-retrieval] Knowledge retrieval failed: ${err.message}`);
      activeChunks = [];
    }
  }

  if (!Array.isArray(activeChunks)) {
    activeChunks = [];
  }

  const systemPrompt = buildConversationAssistantPrompt({
    projectContext,
    retrievedChunks: activeChunks,
  });

  // Sanitize prior messages (chronological order, max 10)
  const formattedPrior = priorMessages
    .slice(-10)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : "",
    }))
    .filter((m) => m.content.trim().length > 0);

  let raw;
  try {
    raw = await generateConversationResponse({
      systemPrompt,
      messages: formattedPrior,
      userPrompt: currentUserMessage,
      schema: CONVERSATION_SCHEMA,
    });
  } catch (error) {
    logUsage({
      feature: "conversation-assistant",
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: error?.code || "AI_PROVIDER_ERROR",
      at: new Date().toISOString(),
    });
    throw error;
  }

  let answer = "";
  let confidence = 0.9;
  let sources = [];

  if (raw && typeof raw === "object") {
    if (typeof raw.answer === "string") {
      answer = raw.answer.trim();
    }
    if (typeof raw.confidence === "number" && !Number.isNaN(raw.confidence)) {
      confidence = Math.max(0, Math.min(1, raw.confidence));
    }
    if (Array.isArray(raw.sources)) {
      sources = raw.sources
        .filter((s) => s && typeof s.label === "string" && typeof s.type === "string")
        .map((s) => {
          // If citation corresponds to a retrieved document chunk, enrich with metadata
          if (s.type === "document") {
            const matchedChunk = activeChunks.find(
              (c) =>
                c.sourceMetadata?.filename &&
                s.label.toLowerCase().includes(c.sourceMetadata.filename.toLowerCase())
            ) || activeChunks[0];

            if (matchedChunk) {
              return {
                type: "document",
                label: s.label,
                excerpt: s.excerpt || matchedChunk.content.slice(0, 150) + "...",
                documentId: String(matchedChunk.documentId || ""),
                pageNumber: matchedChunk.sourceMetadata?.pageNumber || null,
                lineStart: matchedChunk.sourceMetadata?.lineStart || null,
                lineEnd: matchedChunk.sourceMetadata?.lineEnd || null,
              };
            }
          }

          return {
            type: s.type,
            label: s.label,
            excerpt: s.excerpt || "",
          };
        });
    }
  } else if (typeof raw === "string") {
    answer = raw.trim();
  }

  // If no document sources were explicitly picked by LLM but documents were retrieved and relevant,
  // ensure grounded document citations are represented
  if (
    activeChunks.length > 0 &&
    !sources.some((s) => s.type === "document") &&
    activeChunks[0].score >= 0.45
  ) {
    const topChunk = activeChunks[0];
    const meta = topChunk.sourceMetadata || {};
    const labelParts = [meta.filename || "Project Document"];
    if (meta.lineStart && meta.lineEnd) labelParts.push(`lines ${meta.lineStart}-${meta.lineEnd}`);
    else if (meta.pageNumber) labelParts.push(`page ${meta.pageNumber}`);

    sources.push({
      type: "document",
      label: labelParts.join(" "),
      excerpt: topChunk.content.slice(0, 160) + "...",
      documentId: String(topChunk.documentId || ""),
      pageNumber: meta.pageNumber || null,
      lineStart: meta.lineStart || null,
      lineEnd: meta.lineEnd || null,
    });
  }

  if (!answer) {
    logUsage({
      feature: "conversation-assistant",
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: "AI_INVALID_RESPONSE",
      at: new Date().toISOString(),
    });
    throw new AiError("AI_INVALID_RESPONSE", "AI returned an empty or invalid response");
  }

  logUsage({
    feature: "conversation-assistant",
    provider,
    model,
    latencyMs: Date.now() - startedAt,
    success: true,
    sourceCount: sources.length,
    chunksRetrieved: activeChunks.length,
    at: new Date().toISOString(),
  });

  return {
    answer,
    confidence,
    sources,
    retrievedChunks: activeChunks,
  };
};

module.exports = {
  generateConversationReply,
  validateUserMessage,
  MAX_MESSAGE_LENGTH,
  CONVERSATION_SCHEMA,
};

