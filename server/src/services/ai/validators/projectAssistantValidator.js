const MAX_QUESTION_LENGTH = 4000;
const MAX_ANSWER_LENGTH = 5000;
const MAX_SOURCES = 10;
const MAX_SOURCE_LABEL = 300;
const SOURCE_TYPES = ["project", "task", "bug"];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// ---------------------------------------------------------------------------
// Question validation. Returns { valid: true, data } or
// { valid: false, code, error }.
// ---------------------------------------------------------------------------

const validateQuestion = (question) => {
  if (typeof question !== "string") {
    return { valid: false, code: "VALIDATION_ERROR", error: "question is required" };
  }

  const trimmed = question.trim();

  if (!trimmed) {
    return { valid: false, code: "VALIDATION_ERROR", error: "question is required" };
  }

  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return {
      valid: false,
      code: "QUESTION_TOO_LARGE",
      error: `question exceeds the maximum of ${MAX_QUESTION_LENGTH} characters`,
    };
  }

  return { valid: true, data: trimmed };
};

// ---------------------------------------------------------------------------
// Structured response validation. Returns { valid: true, data } or
// { valid: false, error }.
// ---------------------------------------------------------------------------

const validateProjectAssistantResponse = (value) => {
  if (!isPlainObject(value)) {
    return { valid: false, error: "AI response is not a JSON object" };
  }

  if (typeof value.answer !== "string" || !value.answer.trim()) {
    return { valid: false, error: 'AI response is missing a valid "answer" field' };
  }

  if (value.answer.length > MAX_ANSWER_LENGTH) {
    return {
      valid: false,
      error: `answer exceeds the maximum of ${MAX_ANSWER_LENGTH} characters`,
    };
  }

  const confidence = Number(value.confidence);

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return { valid: false, error: "AI response has an invalid confidence value" };
  }

  if (!Array.isArray(value.sources)) {
    return { valid: false, error: 'AI response is missing a "sources" array' };
  }

  const sources = [];

  for (const source of value.sources.slice(0, MAX_SOURCES)) {
    if (!isPlainObject(source)) {
      return { valid: false, error: "AI response contains an invalid source entry" };
    }

    if (!SOURCE_TYPES.includes(source.type)) {
      return { valid: false, error: "AI response contains a source with an invalid type" };
    }

    if (typeof source.label !== "string" || !source.label.trim()) {
      return {
        valid: false,
        error: "AI response contains a source with an invalid label",
      };
    }

    sources.push({
      type: source.type,
      label: source.label.trim().slice(0, MAX_SOURCE_LABEL),
    });
  }

  return {
    valid: true,
    data: {
      answer: value.answer.trim(),
      confidence,
      sources,
    },
  };
};

module.exports = {
  validateQuestion,
  validateProjectAssistantResponse,
  MAX_QUESTION_LENGTH,
  MAX_ANSWER_LENGTH,
  MAX_SOURCES,
  SOURCE_TYPES,
};