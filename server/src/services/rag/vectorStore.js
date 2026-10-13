const DocumentChunk = require("../../models/DocumentChunk");

const cosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

class MongoVectorStore {
  async upsertChunks(chunks = []) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return [];
    }

    const inserted = await DocumentChunk.insertMany(chunks);
    return inserted;
  }

  async searchSimilarChunks({
    projectId,
    queryEmbedding,
    topK = 5,
    minScore = 0.2,
  }) {
    if (!projectId || !Array.isArray(queryEmbedding)) {
      return [];
    }

    // Strict project-scoped retrieval: only fetch chunks for this project
    const chunks = await DocumentChunk.find({
      projectId,
      embedding: { $exists: true, $ne: [] },
    })
      .select("documentId projectId chunkIndex content embedding sourceMetadata contentHash")
      .lean();

    if (chunks.length === 0) {
      return [];
    }

    // Compute similarity score for each candidate chunk
    const scoredChunks = chunks
      .map((chunk) => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        return {
          _id: chunk._id,
          documentId: chunk.documentId,
          projectId: chunk.projectId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          sourceMetadata: chunk.sourceMetadata || {},
          score: Number(score.toFixed(4)),
        };
      })
      .filter((chunk) => chunk.score >= minScore)
      .sort((a, b) => b.score - a.score);

    // Return top-K deduplicated chunks
    return scoredChunks.slice(0, topK);
  }

  async deleteDocumentVectors(documentId) {
    if (!documentId) return { deletedCount: 0 };
    return DocumentChunk.deleteMany({ documentId });
  }

  async deleteProjectVectors(projectId) {
    if (!projectId) return { deletedCount: 0 };
    return DocumentChunk.deleteMany({ projectId });
  }
}

// Default export uses MongoVectorStore
const vectorStore = new MongoVectorStore();

module.exports = {
  vectorStore,
  MongoVectorStore,
  cosineSimilarity,
};
