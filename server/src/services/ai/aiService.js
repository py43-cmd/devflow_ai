const { generateStructuredResponse, AiError, getConfig } = require("./aiProvider");
const { buildBugAnalysisPrompt } = require("./promptBuilder");
const { validateBugAnalysis } = require("./validators/bugAnalysisValidator");

// JSON schema describing the expected structured response. It is passed to the
// provider so future providers (with native schema support) can enforce it too.
const BUG_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    summary: { type: "string" },
    rootCause: { type: "string" },
    explanation: { type: "string" },
    suggestedFix: { type: "string" },
    prevention: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "severity",
    "summary",
    "rootCause",
    "explanation",
    "suggestedFix",
    "prevention",
    "confidence",
  ],
};

// Lightweight usage logging hook. Intentionally not persisted yet; a full
// AIUsage model can be added later without changing callers. Logs never
// include prompts, code, or secrets.
const logUsage = (record) => {
  console.log(`[ai] ${JSON.stringify(record)}`);
};

const analyzeBug = async ({ bug, project }) => {
  const startedAt = Date.now();
  const { provider, model } = getConfig();

  const { systemPrompt, userPrompt } = buildBugAnalysisPrompt(bug, project);

  let raw;

  try {
    raw = await generateStructuredResponse({
      systemPrompt,
      userPrompt,
      schema: BUG_ANALYSIS_SCHEMA,
    });
  } catch (error) {
    logUsage({
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: error?.code || "AI_PROVIDER_ERROR",
      at: new Date().toISOString(),
    });

    throw error;
  }

  const validation = validateBugAnalysis(raw);

  if (!validation.valid) {
    logUsage({
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
    provider,
    model,
    latencyMs: Date.now() - startedAt,
    success: true,
    at: new Date().toISOString(),
  });

  return validation.data;
};

module.exports = { analyzeBug, BUG_ANALYSIS_SCHEMA };
