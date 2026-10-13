const crypto = require("crypto");
const { getConfig, AiError } = require("../ai/aiProvider");

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const VECTOR_DIMENSION = 1536;

// Deterministic normalized embedding fallback for offline / test environments
const generateDeterministicVector = (text, dimension = VECTOR_DIMENSION) => {
  const hash = crypto.createHash("sha256").update(text.trim()).digest();
  const vector = new Float64Array(dimension);

  for (let i = 0; i < dimension; i++) {
    const byte = hash[i % hash.length];
    const prev = hash[(i * 7 + 13) % hash.length];
    vector[i] = ((byte ^ prev) - 128) / 128.0;
  }

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < dimension; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;

  return Array.from(vector).map((v) => Number((v / norm).toFixed(6)));
};

const generateBatchEmbeddings = async (texts = []) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const config = getConfig();

  // If no API key is configured or offline provider, use deterministic normalized vectors
  if (!config.apiKey || config.apiKey === "test-key" || config.provider === "mock") {
    return texts.map((t) => generateDeterministicVector(t));
  }

  const model = process.env.AI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs || 30000);

  try {
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: texts,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      // In case of provider error or rate limit, log and fall back safely
      console.warn(
        `[embedding] Provider returned ${response.status}. Using deterministic fallback vector.`
      );
      return texts.map((t) => generateDeterministicVector(t));
    }

    const payload = await response.json();
    const data = payload?.data;

    if (!Array.isArray(data) || data.length !== texts.length) {
      throw new AiError("AI_INVALID_RESPONSE", "Invalid embedding payload from provider");
    }

    // Sort by index to maintain original order
    const sorted = [...data].sort((a, b) => a.index - b.index);
    return sorted.map((item) => {
      const vec = item.embedding;
      if (!Array.isArray(vec) || vec.length === 0) {
        throw new AiError("AI_INVALID_RESPONSE", "Empty embedding vector returned");
      }
      return vec;
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      throw new AiError("AI_TIMEOUT", "Embedding provider request timed out");
    }
    // Fall back gracefully so document processing does not permanently halt if embedding API is unreachable
    console.warn(
      `[embedding] Embedding API call failed: ${err.message}. Using deterministic fallback vector.`
    );
    return texts.map((t) => generateDeterministicVector(t));
  }
};

const generateQueryEmbedding = async (queryText = "") => {
  if (typeof queryText !== "string" || !queryText.trim()) {
    throw new Error("Query text is required for embedding generation");
  }

  const results = await generateBatchEmbeddings([queryText.trim()]);
  return results[0];
};

module.exports = {
  generateBatchEmbeddings,
  generateQueryEmbedding,
  generateDeterministicVector,
  DEFAULT_EMBEDDING_MODEL,
  VECTOR_DIMENSION,
};
