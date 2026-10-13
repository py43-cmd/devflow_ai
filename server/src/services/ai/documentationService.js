const { generateStructuredResponse, AiError, getConfig } = require("./aiProvider");
const { buildDocumentationPrompt } = require("./promptBuilder");
const {
  validateEndpointInput,
  validateDocumentation,
  HTTP_METHODS,
} = require("./validators/documentationValidator");

// JSON schema passed to the provider so schema-aware providers can enforce it.
const DOCUMENTATION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    method: { type: "string", enum: HTTP_METHODS },
    path: { type: "string" },
    authentication: {
      type: "object",
      properties: {
        required: { type: "boolean" },
        description: { type: "string" },
      },
      required: ["required", "description"],
    },
    request: {
      type: "object",
      properties: {
        headers: { type: "array" },
        pathParameters: { type: "array" },
        queryParameters: { type: "array" },
        body: { type: ["object", "null"] },
      },
      required: ["headers", "pathParameters", "queryParameters", "body"],
    },
    responses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          status: { type: "number" },
          description: { type: "string" },
          example: {},
        },
        required: ["status", "description"],
      },
    },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          status: { type: "number" },
          description: { type: "string" },
        },
        required: ["status", "description"],
      },
    },
    exampleRequest: { type: "string" },
    exampleResponse: { type: "string" },
  },
  required: [
    "title",
    "summary",
    "method",
    "path",
    "authentication",
    "request",
    "responses",
    "errors",
    "exampleRequest",
    "exampleResponse",
  ],
};

// Lightweight usage logging hook (mirrors aiService). Never logs input contents.
const logUsage = (record) => {
  console.log(`[ai] ${JSON.stringify(record)}`);
};

const generateDocumentation = async ({ project = null, endpoint = null }) => {
  const startedAt = Date.now();
  const { provider, model } = getConfig();

  // 1. Validate the supplied endpoint information (untrusted input).
  const inputValidation = validateEndpointInput(endpoint);

  if (!inputValidation.valid) {
    throw new AiError(inputValidation.code, inputValidation.error);
  }

  // Limited project context only — name, description, technologies.
  const projectContext = project
    ? {
        name: project.name,
        description: project.description,
        technologies: project.technologies,
      }
    : null;

  // 2. Build the documentation prompt (with prompt-injection protection).
  const { systemPrompt, userPrompt } = buildDocumentationPrompt({
    projectContext,
    endpoint: inputValidation.data,
  });

  // 3. Call the existing provider abstraction.
  let raw;

  try {
    raw = await generateStructuredResponse({
      systemPrompt,
      userPrompt,
      schema: DOCUMENTATION_SCHEMA,
    });
  } catch (error) {
    logUsage({
      feature: "documentation",
      provider,
      model,
      method: inputValidation.data.method,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: error?.code || "AI_PROVIDER_ERROR",
      at: new Date().toISOString(),
    });

    throw error;
  }

  // 4/5. Validate the structured output.
  const validation = validateDocumentation(raw);

  if (!validation.valid) {
    logUsage({
      feature: "documentation",
      provider,
      model,
      method: inputValidation.data.method,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: "AI_INVALID_RESPONSE",
      at: new Date().toISOString(),
    });

    throw new AiError("AI_INVALID_RESPONSE", validation.error);
  }

  logUsage({
    feature: "documentation",
    provider,
    model,
    method: inputValidation.data.method,
    latencyMs: Date.now() - startedAt,
    success: true,
    at: new Date().toISOString(),
  });

  // 6. Return the documentation.
  return validation.data;
};

module.exports = { generateDocumentation, DOCUMENTATION_SCHEMA };
