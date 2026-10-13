const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Input limits keep prompts bounded. Output limits keep the preview payload
// bounded even if the model is verbose, and align with the Task model caps
// (title maxlength 150, description maxlength 2000).
const LIMITS = {
  goal: 2000,
  constraints: 2000,
  context: 2000,
  maxTasks: 20,
  defaultMaxTasks: 8,

  title: 150,
  description: 2000,
  summary: 3000,
  tagLength: 50,
  tagsPerTask: 10,
  subtasksPerTask: 15,
  subtaskLength: 200,
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const asString = (value) => (typeof value === "string" ? value.trim() : "");

const clampText = (value, max) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
};

const normalizePriority = (value) => {
  const text = typeof value === "string" ? value.trim().toUpperCase() : "";
  return PRIORITIES.includes(text) ? text : null;
};

const normalizeStringList = (list, itemLimit, maxItems) => {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, itemLimit))
    .filter(Boolean)
    .slice(0, maxItems);
};

// ---------------------------------------------------------------------------
// Input validation — the goal/context supplied by the developer.
// Returns { valid: true, data } or { valid: false, code, error }.
// ---------------------------------------------------------------------------

const validateTaskGenerationInput = (input) => {
  if (!isPlainObject(input)) {
    return { valid: false, code: "VALIDATION_ERROR", error: "input must be an object" };
  }

  const goal = asString(input.goal);

  if (!goal) {
    return { valid: false, code: "VALIDATION_ERROR", error: "goal is required" };
  }

  if (goal.length > LIMITS.goal) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `goal exceeds the maximum of ${LIMITS.goal} characters`,
    };
  }

  const constraints = asString(input.constraints);

  if (constraints.length > LIMITS.constraints) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `constraints exceeds the maximum of ${LIMITS.constraints} characters`,
    };
  }

  const context = asString(input.context);

  if (context.length > LIMITS.context) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `context exceeds the maximum of ${LIMITS.context} characters`,
    };
  }

  let maxTasks = LIMITS.defaultMaxTasks;

  if (input.maxTasks !== undefined && input.maxTasks !== null && input.maxTasks !== "") {
    const parsed = Number(input.maxTasks);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > LIMITS.maxTasks) {
      return {
        valid: false,
        code: "VALIDATION_ERROR",
        error: `maxTasks must be a number between 1 and ${LIMITS.maxTasks}`,
      };
    }

    maxTasks = Math.floor(parsed);
  }

  return {
    valid: true,
    data: { goal, constraints, context, maxTasks },
  };
};

// ---------------------------------------------------------------------------
// Output validation — the structured task list returned by the AI.
// Returns { valid: true, data } or { valid: false, error }.
// ---------------------------------------------------------------------------

const validateTaskGenerationOutput = (value, maxTasks = LIMITS.defaultMaxTasks) => {
  if (!isPlainObject(value)) {
    return { valid: false, error: "AI response is not a JSON object" };
  }

  if (typeof value.summary !== "string" || !value.summary.trim()) {
    return { valid: false, error: 'AI response is missing a valid "summary" field' };
  }

  if (!Array.isArray(value.tasks) || value.tasks.length === 0) {
    return { valid: false, error: 'AI response is missing a non-empty "tasks" array' };
  }

  const tasks = [];

  for (const item of value.tasks.slice(0, maxTasks)) {
    if (!isPlainObject(item)) {
      return { valid: false, error: "AI response contains an invalid task entry" };
    }

    const title = clampText(item.title, LIMITS.title);

    if (title.length < 2) {
      return {
        valid: false,
        error: "AI response contains a task with a missing or too-short title",
      };
    }

    const estimated = Number(item.estimatedHours);

    tasks.push({
      title,
      description: clampText(item.description, LIMITS.description),
      priority: normalizePriority(item.priority) || "MEDIUM",
      estimatedHours: Number.isFinite(estimated) && estimated >= 0 ? estimated : 0,
      tags: normalizeStringList(item.tags, LIMITS.tagLength, LIMITS.tagsPerTask),
      subtasks: normalizeStringList(
        item.subtasks,
        LIMITS.subtaskLength,
        LIMITS.subtasksPerTask,
      ),
    });
  }

  return {
    valid: true,
    data: {
      summary: clampText(value.summary, LIMITS.summary),
      tasks,
    },
  };
};

module.exports = {
  validateTaskGenerationInput,
  validateTaskGenerationOutput,
  normalizePriority,
  PRIORITIES,
  LIMITS,
};
