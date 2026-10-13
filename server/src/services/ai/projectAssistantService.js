const { generateStructuredResponse, AiError, getConfig } = require("./aiProvider");
const { buildProjectAssistantPrompt } = require("./promptBuilder");
const { buildProjectContext } = require("./projectContextBuilder");
const {
  validateQuestion,
  validateProjectAssistantResponse,
  SOURCE_TYPES,
} = require("./validators/projectAssistantValidator");

// JSON schema passed to the provider so schema-aware providers can enforce it.
const PROJECT_ASSISTANT_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: SOURCE_TYPES },
          label: { type: "string" },
        },
        required: ["type", "label"],
      },
    },
  },
  required: ["answer", "confidence", "sources"],
};

// Lightweight usage logging hook. Never logs question or context contents.
const logUsage = (record) => {
  console.log(`[ai] ${JSON.stringify(record)}`);
};

const answerProjectQuestion = async ({
  project = {},
  tasks = [],
  bugs = [],
  question = "",
} = {}) => {
  const startedAt = Date.now();
  const { provider, model } = getConfig();

  // 1. Validate the question.
  const questionValidation = validateQuestion(question);

  if (!questionValidation.valid) {
    throw new AiError(questionValidation.code, questionValidation.error);
  }

  // 2/3. Build a limited, prioritized project context.
  const projectContext = buildProjectContext({ project, tasks, bugs });

  // 4. Build a safe prompt (with prompt-injection protection).
  const { systemPrompt, userPrompt } = buildProjectAssistantPrompt({
    projectContext,
    question: questionValidation.data,
  });

  // 5. Call the existing AI service/provider.
  let raw;

  try {
    raw = await generateStructuredResponse({
      systemPrompt,
      userPrompt,
      schema: PROJECT_ASSISTANT_SCHEMA,
    });
  } catch (error) {
    logUsage({
      feature: "project-assistant",
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: error?.code || "AI_PROVIDER_ERROR",
      at: new Date().toISOString(),
    });

    throw error;
  }

  // 6/7. Parse and validate the structured response.
  const validation = validateProjectAssistantResponse(raw);

  if (!validation.valid) {
    logUsage({
      feature: "project-assistant",
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: "AI_INVALID_RESPONSE",
      at: new Date().toISOString(),
    });

    throw new AiError("AI_INVALID_RESPONSE", validation.error);
  }

  logUsage({
    feature: "project-assistant",
    provider,
    model,
    latencyMs: Date.now() - startedAt,
    success: true,
    sourceCount: validation.data.sources.length,
    at: new Date().toISOString(),
  });

  // 8. Return the structured answer.
  return validation.data;
};

module.exports = { answerProjectQuestion, PROJECT_ASSISTANT_SCHEMA };