const { generateStructuredResponse, AiError, getConfig } = require("./aiProvider");
const { buildCodeReviewPrompt, LIMITS } = require("./promptBuilder");
const { validateCodeReview, SEVERITIES, CATEGORIES } = require("./validators/codeReviewValidator");

const MAX_CODE_LENGTH = LIMITS.reviewCode;

// Aliases mapped onto canonical language names. Unknown languages are passed
// through (lower-cased) rather than rejected.
const LANGUAGE_ALIASES = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  nodejs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  python3: "python",
  "c++": "cpp",
  cxx: "cpp",
  cc: "cpp",
  "c#": "csharp",
  csharp: "csharp",
  golang: "go",
  rs: "rust",
  rb: "ruby",
  postgres: "sql",
  postgresql: "sql",
  mysql: "sql",
  sqlite: "sql",
  scss: "css",
  sass: "css",
  less: "css",
  htm: "html",
};

const normalizeLanguage = (language) => {
  const raw = typeof language === "string" ? language.trim().toLowerCase() : "";

  if (!raw) {
    return "unknown";
  }

  const cleaned = raw.replace(/^\./, "").slice(0, 40);

  return LANGUAGE_ALIASES[cleaned] || cleaned;
};

// JSON schema passed to the provider so schema-aware providers can enforce it.
const CODE_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    score: { type: "number", minimum: 0, maximum: 100 },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: SEVERITIES },
          category: { type: "string", enum: CATEGORIES },
          line: { type: ["number", "null"] },
          problem: { type: "string" },
          explanation: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["severity", "category", "line", "problem", "explanation", "suggestion"],
      },
    },
  },
  required: ["summary", "score", "issues"],
};

// Lightweight usage logging hook (mirrors aiService). Never logs code or secrets.
const logUsage = (record) => {
  console.log(`[ai] ${JSON.stringify(record)}`);
};

const reviewCode = async ({ code, language, project = null }) => {
  const startedAt = Date.now();
  const { provider, model } = getConfig();

  // 1. Validate input. Code is untrusted user input.
  if (typeof code !== "string" || !code.trim()) {
    throw new AiError("CODE_REQUIRED", "Code is required");
  }

  if (code.length > MAX_CODE_LENGTH) {
    throw new AiError("CODE_TOO_LARGE", "Code exceeds the maximum length");
  }

  const normalizedLanguage = normalizeLanguage(language);

  // 2. Build a safe prompt (with prompt-injection protection).
  const { systemPrompt, userPrompt } = buildCodeReviewPrompt({
    code,
    language: normalizedLanguage,
    project,
  });

  // 3. Call the existing provider abstraction.
  let raw;

  try {
    raw = await generateStructuredResponse({
      systemPrompt,
      userPrompt,
      schema: CODE_REVIEW_SCHEMA,
    });
  } catch (error) {
    logUsage({
      feature: "code-review",
      provider,
      model,
      language: normalizedLanguage,
      codeLength: code.length,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: error?.code || "AI_PROVIDER_ERROR",
      at: new Date().toISOString(),
    });

    throw error;
  }

  // 4/5. Validate the parsed JSON response.
  const validation = validateCodeReview(raw);

  if (!validation.valid) {
    logUsage({
      feature: "code-review",
      provider,
      model,
      language: normalizedLanguage,
      codeLength: code.length,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: "AI_INVALID_RESPONSE",
      at: new Date().toISOString(),
    });

    throw new AiError("AI_INVALID_RESPONSE", validation.error);
  }

  logUsage({
    feature: "code-review",
    provider,
    model,
    language: normalizedLanguage,
    codeLength: code.length,
    latencyMs: Date.now() - startedAt,
    success: true,
    at: new Date().toISOString(),
  });

  // 6. Return structured review data.
  return validation.data;
};

module.exports = { reviewCode, normalizeLanguage, MAX_CODE_LENGTH, CODE_REVIEW_SCHEMA };
