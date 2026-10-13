const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const {
  extractDocumentText,
  isSupportedFile,
  ExtractionError,
} = require("../src/services/rag/documentExtractor");
const { chunkDocument } = require("../src/services/rag/chunkingService");
const {
  generateDeterministicVector,
  generateQueryEmbedding,
  VECTOR_DIMENSION,
} = require("../src/services/rag/embeddingService");
const {
  cosineSimilarity,
  MongoVectorStore,
} = require("../src/services/rag/vectorStore");
const {
  buildConversationAssistantPrompt,
} = require("../src/services/ai/promptBuilder");
const ProjectDocument = require("../src/models/ProjectDocument");
const DocumentChunk = require("../src/models/DocumentChunk");

test("RAG - Document Extractor", async (t) => {
  await t.test("recognizes supported file formats", () => {
    assert.equal(isSupportedFile("readme.md"), true);
    assert.equal(isSupportedFile("server.js"), true);
    assert.equal(isSupportedFile("main.py"), true);
    assert.equal(isSupportedFile("schema.sql"), true);
    assert.equal(isSupportedFile("data.json"), true);
    assert.equal(isSupportedFile("guide.pdf"), true);
    assert.equal(isSupportedFile("malware.exe"), false);
    assert.equal(isSupportedFile("script.sh"), false);
  });

  await t.test("rejects unsupported file formats with EXTRACTION_FAILED / UNSUPPORTED_TYPE", async () => {
    await assert.rejects(
      async () => {
        await extractDocumentText(Buffer.from("binary"), {
          originalName: "program.exe",
        });
      },
      (err) => err.code === "UNSUPPORTED_TYPE"
    );
  });

  await t.test("rejects empty files (0 bytes)", async () => {
    await assert.rejects(
      async () => {
        await extractDocumentText(Buffer.from(""), {
          originalName: "empty.md",
        });
      },
      (err) => err.code === "EMPTY_FILE"
    );
  });

  await t.test("rejects malformed JSON", async () => {
    await assert.rejects(
      async () => {
        await extractDocumentText(Buffer.from("{ invalid json content "), {
          originalName: "bad.json",
        });
      },
      (err) => err.code === "MALFORMED_JSON"
    );
  });

  await t.test("extracts source code and preserves text cleanly", async () => {
    const code = "function add(a, b) {\n  return a + b;\n}\n";
    const res = await extractDocumentText(Buffer.from(code), {
      originalName: "math.js",
    });

    assert.equal(res.type, "js");
    assert.ok(res.text.includes("function add(a, b)"));
    assert.equal(res.pages.length, 1);
  });
});

test("RAG - Chunking Service", async (t) => {
  await t.test("splits long text into overlapping chunks with line tracking", () => {
    const lines = [];
    for (let i = 1; i <= 80; i++) {
      lines.push(`Line ${i}: This is engineering documentation line describing architecture.`);
    }
    const fullText = lines.join("\n");

    const chunks = chunkDocument({
      text: fullText,
      originalName: "architecture.md",
      chunkSize: 400,
      chunkOverlap: 80,
    });

    assert.ok(chunks.length >= 3);
    assert.equal(chunks[0].chunkIndex, 0);
    assert.equal(chunks[0].sourceMetadata.filename, "architecture.md");
    assert.ok(chunks[0].sourceMetadata.lineStart >= 1);
    assert.ok(chunks[0].sourceMetadata.lineEnd >= chunks[0].sourceMetadata.lineStart);
    assert.ok(chunks[0].contentHash.length === 64); // SHA-256
  });

  await t.test("preserves Markdown headings across chunks", () => {
    const md = "# Overview\nThis is overview text.\n\n## Authentication\nLogin tokens are JWT.";
    const chunks = chunkDocument({
      text: md,
      originalName: "spec.md",
      chunkSize: 60,
      chunkOverlap: 10,
    });

    assert.ok(chunks.length >= 2);
    const authChunk = chunks.find((c) => c.content.includes("Login tokens"));
    assert.ok(authChunk);
    assert.equal(authChunk.sourceMetadata.heading, "Authentication");
  });
});

test("RAG - Embedding Service", async (t) => {
  await t.test("generates normalized unit vector of correct dimension", () => {
    const vec = generateDeterministicVector("DevFlow AI Vector Search Test");
    assert.equal(vec.length, VECTOR_DIMENSION);

    let norm = 0;
    for (const v of vec) norm += v * v;
    // Normalized unit vector length is approx 1.0
    assert.ok(Math.abs(Math.sqrt(norm) - 1.0) < 0.05);
  });

  await t.test("generateQueryEmbedding produces valid embedding array", async () => {
    const queryVec = await generateQueryEmbedding("Where is the user login route?");
    assert.ok(Array.isArray(queryVec));
    assert.equal(queryVec.length, VECTOR_DIMENSION);
  });
});

test("RAG - Vector Store & Cosine Similarity", async (t) => {
  await t.test("cosineSimilarity returns 1.0 for identical vectors and 0.0 for orthogonal", () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];

    assert.equal(cosineSimilarity(v1, v2), 1.0);
    assert.equal(cosineSimilarity(v1, v3), 0.0);
  });

  await t.test("searchSimilarChunks enforces strict project-scoped isolation", async () => {
    const store = new MongoVectorStore();

    // Mock DocumentChunk.find
    const origFind = DocumentChunk.find;
    const projectAId = "507f1f77bcf86cd799439001";
    const projectBId = "507f1f77bcf86cd799439002";

    const queryVec = generateDeterministicVector("login authentication");
    const docAVec = queryVec;

    try {
      DocumentChunk.find = (filter) => {
        // Assert that the MongoDB filter specifies the project ID
        assert.equal(filter.projectId, projectAId);
        return {
          select: () => ({
            lean: async () => [
              {
                _id: "chunk-1",
                documentId: "doc-1",
                projectId: projectAId,
                chunkIndex: 0,
                content: "User login authentication tokens are verified by middleware.",
                embedding: docAVec,
                sourceMetadata: { filename: "auth.js", lineStart: 1, lineEnd: 20 },
              },
            ],
          }),
        };
      };

      const results = await store.searchSimilarChunks({
        projectId: projectAId,
        queryEmbedding: queryVec,
        topK: 5,
        minScore: 0.1,
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].projectId, projectAId);
      assert.ok(results[0].score > 0.8);
      assert.equal(results[0].sourceMetadata.filename, "auth.js");
    } finally {
      DocumentChunk.find = origFind;
    }
  });
});

test("RAG - Assistant Grounding and Source Citations", async (t) => {
  await t.test("buildConversationAssistantPrompt formats retrieved chunks and citation instructions", () => {
    const prompt = buildConversationAssistantPrompt({
      projectContext: { project: { name: "DevFlow" }, tasks: [], bugs: [] },
      retrievedChunks: [
        {
          content: "The API handles authentication via Bearer JWT tokens in Authorization headers.",
          sourceMetadata: {
            filename: "authRoutes.js",
            lineStart: 10,
            lineEnd: 25,
            heading: "Auth Flow",
          },
        },
      ],
    });

    assert.ok(prompt.includes("=== RETRIEVED PROJECT KNOWLEDGE DOCUMENTS (untrusted) ==="));
    assert.ok(prompt.includes("filename: authRoutes.js"));
    assert.ok(prompt.includes("lines: 10-25"));
    assert.ok(prompt.includes("heading: Auth Flow"));
    assert.ok(prompt.includes("The API handles authentication via Bearer JWT"));
    assert.ok(prompt.includes('"type": "project" | "task" | "bug" | "document"'));
  });
});
