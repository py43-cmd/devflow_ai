const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

class AiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

const getConfig = () => ({
  provider: (process.env.AI_PROVIDER || "").trim().toLowerCase(),
  apiKey: (process.env.AI_API_KEY || "").trim(),
  model: (process.env.AI_MODEL || "").trim(),
  baseUrl: (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  timeoutMs: Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
});

const assertConfigured = (config) => {
  if (!config.provider || !config.apiKey || !config.model) {
    throw new AiError("AI_NOT_CONFIGURED", "AI provider is not configured");
  }
};

const stripCodeFences = (text) => {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
};

// OpenAI-compatible Chat Completions provider. Works with OpenAI and any
// service exposing the same /chat/completions contract (Groq, OpenRouter, etc.)
// by pointing AI_BASE_URL at it.
const openAiCompatible = async ({
  systemPrompt,
  userPrompt,
  messages = [],
  schema,
  config,
}) => {
  const systemContent = schema
    ? `${systemPrompt}\n\nReturn a single JSON object matching this schema exactly:\n${JSON.stringify(schema)}`
    : systemPrompt;

  const requestMessages = [{ role: "system", content: systemContent }];

  if (Array.isArray(messages) && messages.length > 0) {
    messages.forEach((m) => {
      if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        requestMessages.push({ role: m.role, content: m.content });
      }
    });
  }

  if (userPrompt && typeof userPrompt === "string") {
    requestMessages.push({ role: "user", content: userPrompt });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let response;

  const requestBody = {
    model: config.model,
    temperature: 0.2,
    messages: requestMessages,
  };

  if (schema) {
    requestBody.response_format = { type: "json_object" };
  }

  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new AiError("AI_TIMEOUT", "AI provider request timed out");
    }

    throw new AiError("AI_PROVIDER_ERROR", "AI provider request failed");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new AiError(
      "AI_PROVIDER_ERROR",
      `AI provider returned status ${response.status}`,
    );
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new AiError("AI_INVALID_RESPONSE", "AI provider returned a non-JSON payload");
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new AiError("AI_INVALID_RESPONSE", "AI provider returned an empty response");
  }

  if (!schema) {
    return content.trim();
  }

  try {
    return JSON.parse(stripCodeFences(content));
  } catch {
    throw new AiError("AI_INVALID_RESPONSE", "AI provider returned invalid JSON content");
  }
};

// Generic entry point used by the AI service. Controllers never call a
// provider SDK directly, so providers can be swapped without touching them.
const generateStructuredResponse = async ({ systemPrompt, userPrompt, schema }) => {
  const config = getConfig();
  assertConfigured(config);

  switch (config.provider) {
    case "openai":
    case "openai-compatible":
      return openAiCompatible({ systemPrompt, userPrompt, schema, config });

    default:
      throw new AiError("AI_NOT_CONFIGURED", "Unsupported AI provider");
  }
};

const generateConversationResponse = async ({
  systemPrompt,
  messages,
  userPrompt,
  schema,
}) => {
  const config = getConfig();
  assertConfigured(config);

  switch (config.provider) {
    case "openai":
    case "openai-compatible":
      return openAiCompatible({
        systemPrompt,
        messages,
        userPrompt,
        schema,
        config,
      });

    default:
      throw new AiError("AI_NOT_CONFIGURED", "Unsupported AI provider");
  }
};

module.exports = {
  generateStructuredResponse,
  generateConversationResponse,
  AiError,
  getConfig,
};

