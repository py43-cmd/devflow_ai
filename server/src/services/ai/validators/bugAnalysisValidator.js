const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const TEXT_FIELDS = [
  "summary",
  "rootCause",
  "explanation",
  "suggestedFix",
  "prevention",
];

// Validates a raw AI response against the required bug analysis schema.
// Returns { valid: true, data } or { valid: false, error }.
const validateBugAnalysis = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, error: "AI response is not a JSON object" };
  }

  if (!SEVERITIES.includes(value.severity)) {
    return { valid: false, error: "AI response has an invalid severity" };
  }

  const data = { severity: value.severity };

  for (const field of TEXT_FIELDS) {
    const fieldValue = value[field];

    if (typeof fieldValue !== "string" || !fieldValue.trim()) {
      return {
        valid: false,
        error: `AI response is missing a valid "${field}" field`,
      };
    }

    data[field] = fieldValue.trim();
  }

  const confidence =
    typeof value.confidence === "number"
      ? value.confidence
      : Number(value.confidence);

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return { valid: false, error: "AI response has an invalid confidence value" };
  }

  data.confidence = confidence;

  return { valid: true, data };
};

module.exports = { validateBugAnalysis, SEVERITIES };
