const Repository = require("../../models/Repository");
const CodeFile = require("../../models/CodeFile");
const CodeSymbol = require("../../models/CodeSymbol");
const CodeRelationship = require("../../models/CodeRelationship");
const { parseCodeFile } = require("./codeParser");
const { buildRepositoryGraph } = require("./codeGraphService");
const { chunkDocument } = require("../rag/chunkingService");
const { generateBatchEmbeddings } = require("../rag/embeddingService");
const { vectorStore } = require("../rag/vectorStore");

const indexRepositoryFiles = async ({ repositoryId, files = [] }) => {
  const repository = await Repository.findById(repositoryId);
  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found`);
  }

  repository.status = "indexing";
  repository.errorMessage = null;
  await repository.save();

  try {
    const projectId = repository.projectId;

    // Load existing files for incremental indexing check
    const existingFiles = await CodeFile.find({ repositoryId }).lean();
    const existingFileMap = new Map(existingFiles.map((f) => [f.relativePath, f]));

    const currentPaths = new Set(files.map((f) => f.relativePath));

    // 1. Delete removed files
    const removedFileIds = [];
    const removedPaths = [];
    for (const [relPath, ef] of existingFileMap.entries()) {
      if (!currentPaths.has(relPath)) {
        removedFileIds.push(ef._id);
        removedPaths.push(relPath);
      }
    }

    if (removedFileIds.length > 0) {
      await CodeFile.deleteMany({ _id: { $in: removedFileIds } });
      await CodeSymbol.deleteMany({ fileId: { $in: removedFileIds } });
      await CodeRelationship.deleteMany({
        repositoryId,
        $or: [{ sourceFile: { $in: removedPaths } }, { targetFile: { $in: removedPaths } }],
      });
    }

    // 2. Parse new and updated files
    const parsedMap = new Map();
    let totalSymbolCount = 0;
    const allCodeChunks = [];

    for (const fileItem of files) {
      const existing = existingFileMap.get(fileItem.relativePath);

      // Skip identical unchanged files if content hash matches
      if (existing && existing.contentHash === fileItem.hash && existing.status === "indexed") {
        const parsed = parseCodeFile({
          relativePath: fileItem.relativePath,
          content: fileItem.content,
        });
        parsedMap.set(fileItem.relativePath, parsed);
        continue;
      }

      // Parse file
      const parsed = parseCodeFile({
        relativePath: fileItem.relativePath,
        content: fileItem.content,
      });
      parsedMap.set(fileItem.relativePath, parsed);

      // Upsert CodeFile
      const codeFile = await CodeFile.findOneAndUpdate(
        { repositoryId, relativePath: fileItem.relativePath },
        {
          projectId,
          language: parsed.language,
          fileSize: fileItem.size,
          contentHash: fileItem.hash,
          lineCount: parsed.lineCount,
          status: "indexed",
        },
        { upsert: true, new: true }
      );

      // Clean old symbols for this file
      await CodeSymbol.deleteMany({ fileId: codeFile._id });

      // Insert new symbols
      if (parsed.symbols.length > 0) {
        const symbolsToInsert = parsed.symbols.map((sym) => ({
          repositoryId,
          projectId,
          fileId: codeFile._id,
          filePath: fileItem.relativePath,
          symbolName: sym.symbolName,
          symbolType: sym.symbolType,
          startLine: sym.startLine,
          endLine: sym.endLine,
          signature: sym.signature || "",
          httpMethod: sym.httpMethod || null,
          httpRoute: sym.httpRoute || null,
          isExported: sym.isExported || false,
        }));

        await CodeSymbol.insertMany(symbolsToInsert);
        totalSymbolCount += symbolsToInsert.length;
      }

      // Create chunks for vector search
      const chunks = chunkDocument({
        text: parsed.cleanText,
        originalName: fileItem.relativePath,
        chunkSize: 700,
        chunkOverlap: 120,
      });

      for (const ch of chunks) {
        allCodeChunks.push({
          projectId,
          content: ch.content,
          sourceMetadata: {
            filename: fileItem.relativePath,
            lineStart: ch.sourceMetadata?.lineStart || 1,
            lineEnd: ch.sourceMetadata?.lineEnd || 1,
            heading: ch.sourceMetadata?.heading || "",
          },
          contentHash: ch.contentHash,
        });
      }
    }

    // 3. Generate embeddings and index code chunks into vectorStore (in batches of 20)
    if (allCodeChunks.length > 0) {
      const BATCH_SIZE = 20;
      for (let i = 0; i < allCodeChunks.length; i += BATCH_SIZE) {
        const batch = allCodeChunks.slice(i, i + BATCH_SIZE);
        const embeddings = await generateBatchEmbeddings(batch.map((b) => b.content));

        const readyChunks = batch.map((item, idx) => ({
          documentId: repositoryId, // link to repository
          projectId: item.projectId,
          chunkIndex: i + idx,
          content: item.content,
          embedding: embeddings[idx] || [],
          sourceMetadata: item.sourceMetadata,
          contentHash: item.contentHash,
        }));

        await vectorStore.upsertChunks(readyChunks);
      }
    }

    // 4. Build and save code relationships
    const { relationships } = buildRepositoryGraph({
      files,
      parsedMap,
      repositoryId,
      projectId,
    });

    await CodeRelationship.deleteMany({ repositoryId });
    if (relationships.length > 0) {
      await CodeRelationship.insertMany(relationships);
    }

    // 5. Update repository status
    const finalFileCount = await CodeFile.countDocuments({ repositoryId });
    const finalSymbolCount = await CodeSymbol.countDocuments({ repositoryId });

    repository.status = "indexed";
    repository.fileCount = finalFileCount;
    repository.symbolCount = finalSymbolCount;
    repository.lastIndexedAt = new Date();
    repository.errorMessage = null;
    await repository.save();

    return {
      success: true,
      fileCount: finalFileCount,
      symbolCount: finalSymbolCount,
      relationshipsCount: relationships.length,
    };
  } catch (err) {
    console.error(`[repositoryIndexer] Failed for repository ${repositoryId}: ${err.message}`);
    repository.status = "failed";
    repository.errorMessage = err.message || "Failed to index repository";
    await repository.save();
    throw err;
  }
};

module.exports = {
  indexRepositoryFiles,
};
