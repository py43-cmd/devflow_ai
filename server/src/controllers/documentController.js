const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Project = require("../models/Project");
const ProjectDocument = require("../models/ProjectDocument");
const { isSupportedFile } = require("../services/rag/documentExtractor");
const { processDocument } = require("../services/rag/ingestionPipeline");
const { vectorStore } = require("../services/rag/vectorStore");
const { generateQueryEmbedding } = require("../services/rag/embeddingService");

const UPLOAD_DIR = path.resolve(__dirname, "../../uploads/documents");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const verifyProjectMembership = async (projectId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return { error: { status: 400, message: "Invalid project ID", code: "INVALID_PROJECT_ID" } };
  }

  const project = await Project.findOne({
    _id: projectId,
    "members.user": userId,
  });

  if (!project) {
    const exists = await Project.exists({ _id: projectId });
    return {
      error: {
        status: exists ? 403 : 404,
        message: exists
          ? "You do not have access to this project"
          : "Project not found",
        code: exists ? "FORBIDDEN" : "PROJECT_NOT_FOUND",
      },
    };
  }

  return { project };
};

const uploadDocument = async (req, res) => {
  try {
    const { projectId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No document file uploaded",
        code: "FILE_REQUIRED",
      });
    }

    const { originalname, mimetype, size, buffer, path: tempPath } = req.file;

    if (!isSupportedFile(originalname)) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(400).json({
        success: false,
        message: `Unsupported file format for ${originalname}. Supported: PDF, Markdown, text, code, JSON, SQL, YAML.`,
        code: "UNSUPPORTED_TYPE",
      });
    }

    // Determine content buffer and hash
    let fileBuffer = buffer;
    if (!fileBuffer && tempPath && fs.existsSync(tempPath)) {
      fileBuffer = fs.readFileSync(tempPath);
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(400).json({
        success: false,
        message: "Uploaded file is empty (0 bytes)",
        code: "EMPTY_FILE",
      });
    }

    const contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Check if an identical file was already indexed in this project
    const existing = await ProjectDocument.findOne({
      projectId,
      contentHash,
      status: "indexed",
    });

    if (existing) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(200).json({
        success: true,
        message: "Identical document is already indexed for this project",
        data: { document: existing },
      });
    }

    // Generate safe storage key
    const safeExt = path.extname(originalname).toLowerCase();
    const storageKey = path.join(UPLOAD_DIR, `${crypto.randomUUID()}${safeExt}`);

    fs.writeFileSync(storageKey, fileBuffer);
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    const document = await ProjectDocument.create({
      projectId,
      uploadedBy: req.user._id,
      originalName: originalname,
      mimeType: mimetype || "application/octet-stream",
      fileSize: size || fileBuffer.length,
      storageKey,
      contentHash,
      status: "uploaded",
    });

    // Ingest asynchronously or synchronously
    try {
      await processDocument(document._id);
      const refreshedDoc = await ProjectDocument.findById(document._id);

      return res.status(201).json({
        success: true,
        data: { document: refreshedDoc },
      });
    } catch (ingestError) {
      const refreshedDoc = await ProjectDocument.findById(document._id);
      return res.status(201).json({
        success: true,
        message: "Document uploaded, but initial processing failed. You can retry it.",
        data: { document: refreshedDoc },
      });
    }
  } catch (error) {
    console.error(`[document] uploadDocument error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
      code: "INTERNAL_ERROR",
    });
  }
};

const getDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    const documents = await ProjectDocument.find({ projectId })
      .select("-storageKey")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    console.error(`[document] getDocuments error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch project documents",
      code: "INTERNAL_ERROR",
    });
  }
};

const getDocument = async (req, res) => {
  try {
    const { projectId, documentId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
        code: "INVALID_ID",
      });
    }

    const document = await ProjectDocument.findOne({
      _id: documentId,
      projectId,
    })
      .select("-storageKey")
      .populate("uploadedBy", "name email");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    console.error(`[document] getDocument error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch document",
      code: "INTERNAL_ERROR",
    });
  }
};

const getDocumentStatus = async (req, res) => {
  try {
    const { projectId, documentId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
        code: "INVALID_ID",
      });
    }

    const document = await ProjectDocument.findOne({
      _id: documentId,
      projectId,
    }).select("status chunkCount errorMessage updatedAt");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        status: document.status,
        chunkCount: document.chunkCount,
        errorMessage: document.errorMessage,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error(`[document] getDocumentStatus error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to check document status",
      code: "INTERNAL_ERROR",
    });
  }
};

const retryDocumentIngestion = async (req, res) => {
  try {
    const { projectId, documentId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
        code: "INVALID_ID",
      });
    }

    const document = await ProjectDocument.findOne({
      _id: documentId,
      projectId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    try {
      await processDocument(document._id);
      const updated = await ProjectDocument.findById(document._id).select("-storageKey");

      return res.status(200).json({
        success: true,
        message: "Document re-indexed successfully",
        data: { document: updated },
      });
    } catch (ingestError) {
      const updated = await ProjectDocument.findById(document._id).select("-storageKey");
      return res.status(400).json({
        success: false,
        message: `Retry processing failed: ${ingestError.message}`,
        code: "PROCESSING_FAILED",
        data: { document: updated },
      });
    }
  } catch (error) {
    console.error(`[document] retryDocumentIngestion error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to retry document processing",
      code: "INTERNAL_ERROR",
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { projectId, documentId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
        code: "INVALID_ID",
      });
    }

    const document = await ProjectDocument.findOne({
      _id: documentId,
      projectId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    // Delete stored file if exists
    if (document.storageKey && fs.existsSync(document.storageKey)) {
      try {
        fs.unlinkSync(document.storageKey);
      } catch (err) {
        console.warn(`[document] Failed to delete file on disk: ${err.message}`);
      }
    }

    // Delete all vectors and chunks
    await vectorStore.deleteDocumentVectors(document._id);

    // Delete document record
    await ProjectDocument.findByIdAndDelete(document._id);

    return res.status(200).json({
      success: true,
      message: "Document and indexed vectors deleted successfully",
    });
  } catch (error) {
    console.error(`[document] deleteDocument error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document",
      code: "INTERNAL_ERROR",
    });
  }
};

const searchProjectKnowledge = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { query, topK = 5, minScore = 0.2 } = req.body;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
        code: "QUERY_REQUIRED",
      });
    }

    const queryEmbedding = await generateQueryEmbedding(query.trim());
    const results = await vectorStore.searchSimilarChunks({
      projectId,
      queryEmbedding,
      topK: Math.min(20, Math.max(1, parseInt(topK, 10) || 5)),
      minScore: Math.max(0, Math.min(1, parseFloat(minScore) || 0.2)),
    });

    return res.status(200).json({
      success: true,
      data: {
        query: query.trim(),
        resultCount: results.length,
        results,
      },
    });
  } catch (error) {
    console.error(`[document] searchProjectKnowledge error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to search project knowledge",
      code: "INTERNAL_ERROR",
    });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  getDocumentStatus,
  retryDocumentIngestion,
  deleteDocument,
  searchProjectKnowledge,
};
