const { generateStructuredResponse, AiError, getConfig } = require("./aiProvider");
const { buildTaskGenerationPrompt } = require("./promptBuilder");
const {
  validateTaskGenerationInput,
  validateTaskGenerationOutput,
  PRIORITIES,
} = require("./validators/taskGeneratorValidator");

// JSON schema passed to the provider so schema-aware providers can enforce it.
const TASK_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: PRIORITIES },
          estimatedHours: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
          subtasks: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description", "priority", "estimatedHours"],
      },
    },
  },
  required: ["summary", "tasks"],
};

// Lightweight usage logging hook. Never logs input contents.
const logUsage = (record) => {
  console.log(`[ai] ${JSON.stringify(record)}`);
};

const generateTasks = async ({ project = null, input = null }) => {
  const startedAt = Date.now();
  const { provider, model } = getConfig();

  // 1. Validate the supplied goal/constraints/context (untrusted input).
  const inputValidation = validateTaskGenerationInput(input);

  if (!inputValidation.valid) {
    throw new AiError(inputValidation.code, inputValidation.error);
  }

  const { goal, constraints, context, maxTasks } = inputValidation.data;

  // Limited project context only — name, description, technologies.
  const projectContext = project
    ? {
        name: project.name,
        description: project.description,
        technologies: project.technologies,
      }
    : null;

  // 2. Build the task-generation prompt (with prompt-injection protection).
  const { systemPrompt, userPrompt } = buildTaskGenerationPrompt({
    projectContext,
    goal,
    constraints,
    context,
    maxTasks,
  });

  // 3. Call the existing provider abstraction.
  let raw;

  try {
    raw = await generateStructuredResponse({
      systemPrompt,
      userPrompt,
      schema: TASK_GENERATION_SCHEMA,
    });
  } catch (error) {
    logUsage({
      feature: "task-generation",
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: error?.code || "AI_PROVIDER_ERROR",
      at: new Date().toISOString(),
    });

    throw error;
  }

  // 4/5. Validate the structured output.
  const validation = validateTaskGenerationOutput(raw, maxTasks);

  if (!validation.valid) {
    logUsage({
      feature: "task-generation",
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
    feature: "task-generation",
    provider,
    model,
    latencyMs: Date.now() - startedAt,
    success: true,
    taskCount: validation.data.tasks.length,
    at: new Date().toISOString(),
  });

  // 6. Return the generated tasks.
  return validation.data;
};

module.exports = { generateTasks, TASK_GENERATION_SCHEMA };
