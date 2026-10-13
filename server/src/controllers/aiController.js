const mongoose = require("mongoose");

const Bug = require("../models/Bug");
const Project = require("../models/Project");
const Task = require("../models/Task");
const aiService = require("../services/ai/aiService");
const codeReviewService = require("../services/ai/codeReviewService");
const documentationService = require("../services/ai/documentationService");
const taskGeneratorService = require("../services/ai/taskGeneratorService");
const projectAssistantService = require("../services/ai/projectAssistantService");
const { AiError } = require("../services/ai/aiProvider");

// Maps internal AI error codes to safe client-facing responses. Provider
// details, stack traces, prompts, and keys are never exposed.
const ERROR_MAP = {
  AI_NOT_CONFIGURED: {
    status: 503,
    message: "AI is not configured.",
    code: "AI_NOT_CONFIGURED",
  },
  AI_TIMEOUT: {
    status: 504,
    message: "AI request timed out. Please try again.",
    code: "AI_TIMEOUT",
  },
  AI_INVALID_RESPONSE: {
    status: 502,
    message: "AI returned an invalid response.",
    code: "AI_INVALID_RESPONSE",
  },
  AI_PROVIDER_ERROR: {
    status: 502,
    message: "AI provider is unavailable. Please try again later.",
    code: "AI_PROVIDER_ERROR",
  },
  CODE_REQUIRED: {
    status: 400,
    message: "Code is required.",
    code: "CODE_REQUIRED",
  },
  CODE_TOO_LARGE: {
    status: 400,
    message: `Code exceeds the maximum length of ${codeReviewService.MAX_CODE_LENGTH} characters.`,
    code: "CODE_TOO_LARGE",
  },
  VALIDATION_ERROR: {
    status: 400,
    message: "Invalid endpoint information.",
    code: "VALIDATION_ERROR",
    detail: true,
  },
  INVALID_HTTP_METHOD: {
    status: 400,
    message: "Unsupported HTTP method. Use GET, POST, PUT, PATCH, or DELETE.",
    code: "INVALID_HTTP_METHOD",
    detail: true,
  },
  QUESTION_TOO_LARGE: {
    status: 400,
    message: "The question is too long.",
    code: "QUESTION_TOO_LARGE",
  },
};

const analyzeBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
        code: "BUG_NOT_FOUND",
      });
    }

    // Authorization must be verified before any data reaches the AI provider.
    const project = await Project.findOne({
      _id: bug.project,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to analyze this bug",
        code: "FORBIDDEN",
      });
    }

    const analysis = await aiService.analyzeBug({ bug, project });

    // Only a validated analysis is persisted. A failed analysis leaves any
    // previously stored analysis untouched.
    bug.aiAnalysis = analysis;
    await bug.save();

    return res.status(200).json({
      success: true,
      data: { analysis },
    });
  } catch (error) {
    if (error instanceof AiError && ERROR_MAP[error.code]) {
      const mapped = ERROR_MAP[error.code];
      console.error(`[ai] analyze failed code=${error.code} bug=${req.params.id}`);
      return res.status(mapped.status).json({
        success: false,
        message: mapped.message,
        code: mapped.code,
      });
    }

    console.error(`[ai] analyze failed code=AI_ANALYSIS_FAILED bug=${req.params.id}`);
    return res.status(500).json({
      success: false,
      message: "Unable to analyze bug",
      code: "AI_ANALYSIS_FAILED",
    });
  }
};

const reviewCode = async (req, res) => {
  try {
    const { code, language, projectId } = req.body || {};

    let project = null;

    // Optional project context. Authorization is verified before any data
    // reaches the AI provider.
    if (projectId) {
      if (!mongoose.isValidObjectId(projectId)) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
          code: "PROJECT_NOT_FOUND",
        });
      }

      // Only the fields used to improve the review are fetched.
      project = await Project.findOne({
        _id: projectId,
        "members.user": req.user._id,
      }).select("name description technologies");

      if (!project) {
        const exists = await Project.exists({ _id: projectId });

        if (!exists) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
            code: "PROJECT_NOT_FOUND",
          });
        }

        return res.status(403).json({
          success: false,
          message: "You don't have permission to use this project",
          code: "FORBIDDEN",
        });
      }
    }

    const review = await codeReviewService.reviewCode({ code, language, project });

    return res.status(200).json({
      success: true,
      data: { review },
    });
  } catch (error) {
    if (error instanceof AiError && ERROR_MAP[error.code]) {
      const mapped = ERROR_MAP[error.code];
      console.error(`[ai] code review failed code=${error.code}`);
      return res.status(mapped.status).json({
        success: false,
        message: mapped.message,
        code: mapped.code,
      });
    }

    console.error("[ai] code review failed code=AI_REVIEW_FAILED");
    return res.status(500).json({
      success: false,
      message: "Unable to review code",
      code: "AI_REVIEW_FAILED",
    });
  }
};

const generateDocumentation = async (req, res) => {
  try {
    const { projectId, endpoint } = req.body || {};

    let project = null;

    // Optional project context. Authorization is verified before any data
    // reaches the AI provider.
    if (projectId) {
      if (!mongoose.isValidObjectId(projectId)) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
          code: "PROJECT_NOT_FOUND",
        });
      }

      // Only the fields used to improve the documentation are fetched.
      project = await Project.findOne({
        _id: projectId,
        "members.user": req.user._id,
      }).select("name description technologies");

      if (!project) {
        const exists = await Project.exists({ _id: projectId });

        if (!exists) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
            code: "PROJECT_NOT_FOUND",
          });
        }

        return res.status(403).json({
          success: false,
          message: "You don't have permission to use this project",
          code: "FORBIDDEN",
        });
      }
    }

    const documentation = await documentationService.generateDocumentation({
      project,
      endpoint,
    });

    return res.status(200).json({
      success: true,
      data: documentation,
    });
  } catch (error) {
    if (error instanceof AiError && ERROR_MAP[error.code]) {
      const mapped = ERROR_MAP[error.code];
      console.error(`[ai] documentation failed code=${error.code}`);
      return res.status(mapped.status).json({
        success: false,
        message: mapped.detail ? error.message : mapped.message,
        code: mapped.code,
      });
    }

    console.error("[ai] documentation failed code=AI_GENERATION_FAILED");
    return res.status(500).json({
      success: false,
      message: "Unable to generate documentation",
      code: "AI_GENERATION_FAILED",
    });
  }
};

const generateTasks = async (req, res) => {
  try {
    const { projectId, goal, constraints, context, maxTasks } = req.body || {};

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
        code: "VALIDATION_ERROR",
      });
    }

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
      });
    }

    // Authorization must be verified before any data reaches the AI provider.
    const project = await Project.findOne({
      _id: projectId,
      "members.user": req.user._id,
    }).select("name description technologies");

    if (!project) {
      const exists = await Project.exists({ _id: projectId });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
          code: "PROJECT_NOT_FOUND",
        });
      }

      return res.status(403).json({
        success: false,
        message: "You don't have permission to use this project",
        code: "FORBIDDEN",
      });
    }

    const result = await taskGeneratorService.generateTasks({
      project,
      input: { goal, constraints, context, maxTasks },
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AiError && ERROR_MAP[error.code]) {
      const mapped = ERROR_MAP[error.code];
      console.error(`[ai] task-generation failed code=${error.code}`);
      return res.status(mapped.status).json({
        success: false,
        message: mapped.detail ? error.message : mapped.message,
        code: mapped.code,
      });
    }

    console.error("[ai] task-generation failed code=AI_GENERATION_FAILED");
    return res.status(500).json({
      success: false,
      message: "Unable to generate tasks",
      code: "AI_GENERATION_FAILED",
    });
  }
};

const projectAssistant = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { question } = req.body || {};

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
      });
    }

    // Authorization must be verified before any data reaches the AI provider.
    const project = await Project.findOne({
      _id: projectId,
      "members.user": req.user._id,
    }).select("name description status technologies");

    if (!project) {
      const exists = await Project.exists({ _id: projectId });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
          code: "PROJECT_NOT_FOUND",
        });
      }

      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
        code: "FORBIDDEN",
      });
    }

    // Only this project's tasks and bugs are fetched. Data isolation is
    // enforced here before any context reaches the model.
    const tasks = await Task.find({ project: project._id })
      .populate("assignee", "name")
      .lean();

    const bugs = await Bug.find({ project: project._id })
      .populate("assignee", "name")
      .lean();

    const result = await projectAssistantService.answerProjectQuestion({
      project,
      tasks,
      bugs,
      question,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AiError && ERROR_MAP[error.code]) {
      const mapped = ERROR_MAP[error.code];
      console.error(`[ai] project-assistant failed code=${error.code}`);
      return res.status(mapped.status).json({
        success: false,
        message: mapped.detail ? error.message : mapped.message,
        code: mapped.code,
      });
    }

    console.error("[ai] project-assistant failed code=AI_ASSISTANT_FAILED");
    return res.status(500).json({
      success: false,
      message: "Unable to answer the question right now",
      code: "AI_ASSISTANT_FAILED",
    });
  }
};

module.exports = {
  analyzeBug,
  reviewCode,
  generateDocumentation,
  generateTasks,
  projectAssistant,
};
