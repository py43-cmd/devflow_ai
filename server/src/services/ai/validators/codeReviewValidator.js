const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const CATEGORIES = [
  "BUG",
  "SECURITY",
  "PERFORMANCE",
  "CODE_QUALITY",
  "MAINTAINABILITY",
  "BEST_PRACTICE",
];

// Cap the number of issues so a runaway model response cannot produce an
// unbounded payload.
const MAX_ISSUES = 50;

const toOptionalLine = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const line = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(line) || line < 1) {
    return null;
  }

  return Math.floor(line);
};

// Validates a raw AI response against the required code review schema.
// Returns { valid: true, data } or { valid: false, error }.
const validateCodeReview = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, error: "AI response is not a JSON object" };
  }

  if (typeof value.summary !== "string" || !value.summary.trim()) {
    return { valid: false, error: 'AI response is missing a valid "summary" field' };
  }

  const score =
    typeof value.score === "number" ? value.score : Number(value.score);

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { valid: false, error: "AI response has an invalid score value" };
  }

  if (!Array.isArray(value.issues)) {
    return { valid: false, error: 'AI response is missing an "issues" array' };
  }

  const issues = [];

  for (const rawIssue of value.issues.slice(0, MAX_ISSUES)) {
    if (!rawIssue || typeof rawIssue !== "object" || Array.isArray(rawIssue)) {
      return { valid: false, error: "AI response contains an invalid issue" };
    }

    if (!SEVERITIES.includes(rawIssue.severity)) {
      return { valid: false, error: "AI response contains an issue with an invalid severity" };
    }

    if (!CATEGORIES.includes(rawIssue.category)) {
      return { valid: false, error: "AI response contains an issue with an invalid category" };
    }

    const issue = {
      severity: rawIssue.severity,
      category: rawIssue.category,
      line: toOptionalLine(rawIssue.line),
    };

    for (const field of ["problem", "explanation", "suggestion"]) {
      const fieldValue = rawIssue[field];

      if (typeof fieldValue !== "string" || !fieldValue.trim()) {
        return {
          valid: false,
          error: `AI response contains an issue missing a valid "${field}" field`,
        };
      }

      issue[field] = fieldValue.trim();
    }

    issues.push(issue);
  }

  return {
    valid: true,
    data: {
      summary: value.summary.trim(),
      score: Math.round(score),
      issues,
    },
  };
};

module.exports = { validateCodeReview, SEVERITIES, CATEGORIES, MAX_ISSUES };
