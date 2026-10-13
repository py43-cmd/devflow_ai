const CodeFile = require("../../models/CodeFile");
const CodeSymbol = require("../../models/CodeSymbol");
const CodeRelationship = require("../../models/CodeRelationship");
const { vectorStore } = require("../rag/vectorStore");
const { generateQueryEmbedding } = require("../rag/embeddingService");

const searchCodebase = async ({
  projectId,
  repositoryId,
  query = "",
  topK = 8,
}) => {
  const trimmed = query.trim();
  if (!trimmed || !projectId) {
    return { symbols: [], files: [], chunks: [], relatedEdges: [] };
  }

  // 1. Symbol lookup (exact and partial name match)
  const symbols = await CodeSymbol.find({
    projectId,
    repositoryId,
    symbolName: { $regex: trimmed, $options: "i" },
  })
    .limit(topK)
    .lean();

  // 2. File path match
  const files = await CodeFile.find({
    projectId,
    repositoryId,
    relativePath: { $regex: trimmed, $options: "i" },
  })
    .limit(topK)
    .lean();

  // 3. Vector semantic search over chunks
  let chunks = [];
  try {
    const queryEmbedding = await generateQueryEmbedding(trimmed);
    chunks = await vectorStore.searchSimilarChunks({
      projectId,
      queryEmbedding,
      topK,
      minScore: 0.25,
    });
  } catch (err) {
    console.warn(`[codebase-retrieval] Vector search failed: ${err.message}`);
  }

  // 4. Trace relationships for top matched symbols or files
  const relevantPaths = new Set([
    ...symbols.map((s) => s.filePath),
    ...files.map((f) => f.relativePath),
    ...chunks.map((c) => c.sourceMetadata?.filename).filter(Boolean),
  ]);

  let relatedEdges = [];
  if (relevantPaths.size > 0) {
    relatedEdges = await CodeRelationship.find({
      projectId,
      repositoryId,
      $or: [
        { sourceFile: { $in: Array.from(relevantPaths) } },
        { targetFile: { $in: Array.from(relevantPaths) } },
      ],
    })
      .limit(15)
      .lean();
  }

  return {
    query: trimmed,
    symbols,
    files,
    chunks,
    relatedEdges,
  };
};

module.exports = {
  searchCodebase,
};
