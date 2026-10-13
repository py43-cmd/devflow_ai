export { PRIORITIES, priorityStyles, formatDateTime } from "./taskMeta";

// Mirrors the server-side input limits so the form can warn before submitting.
export const LIMITS = {
  goal: 2000,
  constraints: 2000,
  context: 2000,
  maxTasks: 20,
  defaultMaxTasks: 8,
};

export const MAX_TASKS = LIMITS.maxTasks;

export const formatTaskAsMarkdown = (task) => {
  const lines = [];

  lines.push(`### ${task.title}`);
  lines.push("");
  lines.push(`- Priority: ${task.priority}`);
  lines.push(`- Estimated hours: ${task.estimatedHours}`);
  if (Array.isArray(task.tags) && task.tags.length > 0) {
    lines.push(`- Tags: ${task.tags.join(", ")}`);
  }
  lines.push("");

  if (task.description) {
    lines.push(task.description);
    lines.push("");
  }

  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    lines.push("Subtasks:");
    task.subtasks.forEach((subtask) => lines.push(`- ${subtask}`));
    lines.push("");
  }

  return lines.join("\n").trim();
};

export const formatTasksAsMarkdown = (generated) => {
  if (!generated) {
    return "";
  }

  const header = ["# Generated Tasks", ""];

  if (generated.summary) {
    header.push(generated.summary);
    header.push("");
  }

  const body = (generated.tasks || []).map(formatTaskAsMarkdown).join("\n\n");

  return [...header, body].join("\n").trim();
};
