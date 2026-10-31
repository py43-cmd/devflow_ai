/*
 * Safe AI configuration check.
 *
 * Usage:
 *   cd server
 *   node scripts/checkAi.js
 *
 * It verifies that the configured provider can:
 *   1. answer a chat request and return valid JSON, and
 *   2. return an embedding vector.
 *
 * It never prints the API key. Exit code 0 = both checks passed.
 */

const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { getConfig, generateStructuredResponse } = require("../src/services/ai/aiProvider");
const { generateBatchEmbeddings } = require("../src/services/rag/embeddingService");

const STATUS = {
  ok: "PASS",
  fail: "FAIL",
  skip: "SKIP",
};

const describeConfig = () => {
  const { provider, apiKey, model, baseUrl, timeoutMs } = getConfig();
  const keyState = apiKey ? `set (length ${apiKey.length})` : "EMPTY";

  return {
    provider: provider || "(empty)",
    model: model || "(empty)",
    baseUrl: baseUrl || "(empty)",
    timeoutMs,
    apiKey: keyState,
    embeddingModel: process.env.AI_EMBEDDING_MODEL || "(default: text-embedding-3-small)",
  };
};

const checkChat = async () => {
  const startedAt = Date.now();

  try {
    const result = await generateStructuredResponse({
      systemPrompt: "You are a health check. Reply with JSON only.",
      userPrompt: 'Return exactly {"ok": true, "message": "pong"}.',
      schema: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          message: { type: "string" },
        },
        required: ["ok", "message"],
      },
    });

    if (!result || result.ok !== true) {
      return { status: STATUS.fail, detail: `unexpected JSON: ${JSON.stringify(result)}` };
    }

    return { status: STATUS.ok, detail: `valid JSON in ${Date.now() - startedAt} ms` };
  } catch (error) {
    return { status: STATUS.fail, detail: `${error.code || "ERROR"}: ${error.message}` };
  }
};

const checkEmbeddings = async () => {
  const startedAt = Date.now();

  try {
    const [vector] = await generateBatchEmbeddings(["DevFlow AI embedding health check"]);

    if (!Array.isArray(vector) || vector.length === 0) {
      return { status: STATUS.fail, detail: "empty vector returned" };
    }

    const sample = vector.slice(0, 3).map((n) => Number(n).toFixed(4));

    return {
      status: STATUS.ok,
      detail: `dimension ${vector.length} in ${Date.now() - startedAt} ms (sample ${sample.join(", ")}…)`,
    };
  } catch (error) {
    return { status: STATUS.fail, detail: `${error.code || "ERROR"}: ${error.message}` };
  }
};

const main = async () => {
  console.log("\nDevFlow AI — provider check");
  console.log("─".repeat(60));

  const config = describeConfig();

  for (const [key, value] of Object.entries(config)) {
    console.log(`${key.padEnd(16)} ${value}`);
  }

  console.log("─".repeat(60));

  if (!config.apiKey || config.apiKey === "EMPTY") {
    console.log("SKIP  AI_API_KEY is empty. Add a key to server/.env and run again.\n");
    process.exit(1);
  }

  if (config.embeddingModel.includes("text-embedding-3-small")) {
    console.log(
      "NOTE  With a non-OpenAI host, set AI_EMBEDDING_MODEL to a model the host provides.\n",
    );
  }

  const chat = await checkChat();
  console.log(`${chat.status}  chat / structured JSON — ${chat.detail}`);

  const embeddings = await checkEmbeddings();
  console.log(`${embeddings.status}  embeddings — ${embeddings.detail}`);

  console.log("─".repeat(60));

  const failed = [chat, embeddings].some((r) => r.status === STATUS.fail);

  if (failed) {
    console.log("\nOne or more checks failed. Common causes:");
    console.log("  • wrong model id for this provider");
    console.log("  • the provider does not support response_format: json_object");
    console.log("  • the provider has no /embeddings endpoint");
    console.log("  • free-tier quota exhausted\n");
    process.exit(1);
  }

  console.log("\nAll checks passed. The AI features should work.\n");
};

main().catch((error) => {
  console.error("Check crashed:", error.message);
  process.exit(1);
});
