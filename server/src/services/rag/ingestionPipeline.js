const fs = require("fs");
const ProjectDocument = require("../../models/ProjectDocument");
const { extractDocumentText } = require("./documentExtractor");
const { chunkDocument } = require("./chunkingService");
const { generateBatchEmbeddings } = require("./embeddingService");
const { vectorStore } = require("./vectorStore");

const processDocument = async (documentId) => {
  const document = await ProjectDocument.findById(documentId);

  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  // Set status to processing
  document.status = "processing";
  document.errorMessage = null;
  await document.save();

  try {
    const filePath = document.storageKey;

    if (!fs.existsSync(filePath)) {
      throw new Error("Stored document file was not found on server disk");
    }

    // 1. Extract text and pages/structure
    const extractionResult = await extractDocumentText(filePath, {
      originalName: document.originalName,
      mimeType: document.mimeType,
    });

    // 2. Chunk document text
    const rawChunks = chunkDocument({
      text: extractionResult.text,
      pages: extractionResult.pages,
      originalName: document.originalName,
    });

    if (rawChunks.length === 0) {
      throw new Error("No extractable text chunks found in document");
    }

    // Clean up any existing vectors/chunks for this document (ensures idempotency on retry)
    await vectorStore.deleteDocumentVectors(document._id);

    // 3. Generate embeddings in batches of 20
    const chunkContents = rawChunks.map((c) => c.content);
    const BATCH_SIZE = 20;
    const allEmbeddings = [];

    for (let i = 0; i < chunkContents.length; i += BATCH_SIZE) {
      const batch = chunkContents.slice(i, i + BATCH_SIZE);
      const embeddings = await generateBatchEmbeddings(batch);
      allEmbeddings.push(...embeddings);
    }

    // 4. Prepare DocumentChunk records
    const chunksToInsert = rawChunks.map((chunk, index) => ({
      documentId: document._id,
      projectId: document.projectId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: allEmbeddings[index] || [],
      sourceMetadata: chunk.sourceMetadata || { filename: document.originalName },
      contentHash: chunk.contentHash,
    }));

    // 5. Upsert chunks into vector store
    await vectorStore.upsertChunks(chunksToInsert);

    // 6. Mark document as indexed
    document.status = "indexed";
    document.chunkCount = chunksToInsert.length;
    document.errorMessage = null;
    await document.save();

    return {
      success: true,
      document,
      chunkCount: chunksToInsert.length,
    };
  } catch (err) {
    console.error(`[rag-ingestion] Failed for document ${documentId}: ${err.message}`);

    document.status = "failed";
    document.errorMessage = err.message || "Document processing failed";
    await document.save();

    throw err;
  }
};

module.exports = {
  processDocument,
};
