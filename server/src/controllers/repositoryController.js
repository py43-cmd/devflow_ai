const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Project = require("../models/Project");
const Repository = require("../models/Repository");
const CodeFile = require("../models/CodeFile");
const CodeSymbol = require("../models/CodeSymbol");
const CodeRelationship = require("../models/CodeRelationship");
const { extractRepositoryArchive } = require("../services/codebase/archiveIngestion");
const { indexRepositoryFiles } = require("../services/codebase/repositoryIndexer");
const { searchCodebase } = require("../services/codebase/codeRetrievalService");
const { traceRequestFlow } = require("../services/codebase/requestFlowTracer");
const { vectorStore } = require("../services/rag/vectorStore");

const REPO_STORAGE_DIR = path.resolve(__dirname, "../../uploads/repositories");

if (!fs.existsSync(REPO_STORAGE_DIR)) {
  fs.mkdirSync(REPO_STORAGE_DIR, { recursive: true });
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
        message: exists ? "You do not have access to this project" : "Project not found",
        code: exists ? "FORBIDDEN" : "PROJECT_NOT_FOUND",
      },
    };
  }

  return { project };
};

const registerOrUploadRepository = async (req, res) => {
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

    // A. ZIP Archive Upload
    if (req.file) {
      const buffer = req.file.buffer;
      const originalName = req.file.originalname || "repository.zip";

      const extraction = extractRepositoryArchive(buffer);

      if (extraction.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No indexable source code files found in archive",
          code: "NO_FILES_FOUND",
        });
      }

      const repoName = originalName.replace(/\.zip$/i, "") || "Codebase";

      const repository = await Repository.create({
        projectId,
        connectedBy: req.user._id,
        provider: "upload",
        repositoryIdentifier: repoName,
        status: "indexing",
      });

      // Save files to disk for code previews
      const repoDir = path.join(REPO_STORAGE_DIR, String(repository._id));
      fs.mkdirSync(repoDir, { recursive: true });

      for (const f of extraction.files) {
        const fullPath = path.join(repoDir, f.relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, f.content, "utf-8");
      }

      // Index files in background/sync
      await indexRepositoryFiles({
        repositoryId: repository._id,
        files: extraction.files,
      });

      const updated = await Repository.findById(repository._id);
      return res.status(201).json({
        success: true,
        data: { repository: updated },
      });
    }

    // B. Git Repository Registration (URL)
    const { repositoryUrl, defaultBranch = "main" } = req.body;
    if (!repositoryUrl || typeof repositoryUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "Either upload a ZIP archive or provide a valid repositoryUrl",
        code: "REPO_INPUT_REQUIRED",
      });
    }

    // SSRF validation: only allowed GitHub/GitLab domains
    const urlPattern = /^https:\/\/(?:www\.)?(github\.com|gitlab\.com)\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\.git)?$/i;
    const match = repositoryUrl.trim().match(urlPattern);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unsupported repository URL. Must be an approved GitHub or GitLab HTTPS URL.",
        code: "INVALID_REPO_URL",
      });
    }

    const repoIdentifier = `${match[2]}/${match[3].replace(/\.git$/i, "")}`;

    const repository = await Repository.create({
      projectId,
      connectedBy: req.user._id,
      provider: match[1].includes("gitlab") ? "gitlab" : "github",
      repositoryIdentifier: repoIdentifier,
      defaultBranch: defaultBranch.trim() || "main",
      status: "indexed",
      lastIndexedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: { repository },
    });
  } catch (error) {
    console.error(`[repository] registerOrUploadRepository error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to connect repository",
      code: error.code || "INTERNAL_ERROR",
    });
  }
};

const getRepositories = async (req, res) => {
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

    const repositories = await Repository.find({ projectId })
      .populate("connectedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { repositories },
    });
  } catch (error) {
    console.error(`[repository] getRepositories error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch repositories",
      code: "INTERNAL_ERROR",
    });
  }
};

const getRepositoryDetails = async (req, res) => {
  try {
    const { projectId, repositoryId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid repository ID",
        code: "INVALID_ID",
      });
    }

    const repository = await Repository.findOne({ _id: repositoryId, projectId })
      .populate("connectedBy", "name email");

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
        code: "NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: { repository },
    });
  } catch (error) {
    console.error(`[repository] getRepositoryDetails error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch repository details",
      code: "INTERNAL_ERROR",
    });
  }
};

const getRepositoryFileTree = async (req, res) => {
  try {
    const { projectId, repositoryId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    const files = await CodeFile.find({ repositoryId, projectId })
      .select("relativePath language fileSize lineCount status")
      .sort({ relativePath: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        totalFiles: files.length,
        files,
      },
    });
  } catch (error) {
    console.error(`[repository] getRepositoryFileTree error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch file tree",
      code: "INTERNAL_ERROR",
    });
  }
};

const getFilePreview = async (req, res) => {
  try {
    const { projectId, repositoryId, fileId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    const codeFile = await CodeFile.findOne({ _id: fileId, repositoryId, projectId });
    if (!codeFile) {
      return res.status(404).json({
        success: false,
        message: "File not found",
        code: "FILE_NOT_FOUND",
      });
    }

    // Try reading content from repository storage on disk
    let content = "";
    const diskPath = path.join(REPO_STORAGE_DIR, String(repositoryId), codeFile.relativePath);
    if (fs.existsSync(diskPath)) {
      content = fs.readFileSync(diskPath, "utf-8");
    }

    // Fetch symbols in this file
    const symbols = await CodeSymbol.find({ fileId: codeFile._id })
      .sort({ startLine: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        file: codeFile,
        content,
        symbols,
      },
    });
  } catch (error) {
    console.error(`[repository] getFilePreview error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to preview file",
      code: "INTERNAL_ERROR",
    });
  }
};

const searchRepository = async (req, res) => {
  try {
    const { projectId, repositoryId } = req.params;
    const { query, topK = 8 } = req.body;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    const results = await searchCodebase({
      projectId,
      repositoryId,
      query,
      topK,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error(`[repository] searchRepository error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to search codebase",
      code: "INTERNAL_ERROR",
    });
  }
};

const traceFlow = async (req, res) => {
  try {
    const { projectId, repositoryId } = req.params;
    const { route } = req.body;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    const trace = await traceRequestFlow({
      repositoryId,
      routeQuery: route || "",
    });

    return res.status(200).json({
      success: true,
      data: trace,
    });
  } catch (error) {
    console.error(`[repository] traceFlow error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to trace request flow",
      code: "INTERNAL_ERROR",
    });
  }
};

const deleteRepository = async (req, res) => {
  try {
    const { projectId, repositoryId } = req.params;

    const authCheck = await verifyProjectMembership(projectId, req.user._id);
    if (authCheck.error) {
      return res.status(authCheck.error.status).json({
        success: false,
        message: authCheck.error.message,
        code: authCheck.error.code,
      });
    }

    const repository = await Repository.findOne({ _id: repositoryId, projectId });
    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
        code: "NOT_FOUND",
      });
    }

    // Cascade delete:
    await CodeFile.deleteMany({ repositoryId });
    await CodeSymbol.deleteMany({ repositoryId });
    await CodeRelationship.deleteMany({ repositoryId });
    await vectorStore.deleteDocumentVectors(repositoryId);

    // Delete disk storage if exists
    const repoDir = path.join(REPO_STORAGE_DIR, String(repositoryId));
    if (fs.existsSync(repoDir)) {
      try {
        fs.rmSync(repoDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`[repository] Failed to remove repo dir: ${err.message}`);
      }
    }

    await Repository.findByIdAndDelete(repositoryId);

    return res.status(200).json({
      success: true,
      message: "Repository and indexed code intelligence removed successfully",
    });
  } catch (error) {
    console.error(`[repository] deleteRepository error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete repository",
      code: "INTERNAL_ERROR",
    });
  }
};

module.exports = {
  registerOrUploadRepository,
  getRepositories,
  getRepositoryDetails,
  getRepositoryFileTree,
  getFilePreview,
  searchRepository,
  traceFlow,
  deleteRepository,
};
