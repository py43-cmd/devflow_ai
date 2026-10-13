const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Bug = require("../models/Bug");
const conversationAssistantService = require("../services/ai/conversationAssistantService");
const { AiError } = require("../services/ai/aiProvider");

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
  MESSAGE_TOO_LARGE: {
    status: 400,
    message: `Message exceeds the maximum length of ${conversationAssistantService.MAX_MESSAGE_LENGTH} characters.`,
    code: "MESSAGE_TOO_LARGE",
  },
  MESSAGE_REQUIRED: {
    status: 400,
    message: "Message content cannot be empty.",
    code: "MESSAGE_REQUIRED",
  },
  INVALID_MESSAGE: {
    status: 400,
    message: "Message must be a string.",
    code: "INVALID_MESSAGE",
  },
};

const createConversation = async (req, res) => {
  try {
    const { projectId, title } = req.body;

    let finalProjectId = null;
    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
          code: "INVALID_PROJECT_ID",
        });
      }

      const project = await Project.findOne({
        _id: projectId,
        "members.user": req.user._id,
      });

      if (!project) {
        const exists = await Project.exists({ _id: projectId });
        return res.status(exists ? 403 : 404).json({
          success: false,
          message: exists
            ? "You do not have access to this project"
            : "Project not found",
          code: exists ? "FORBIDDEN" : "PROJECT_NOT_FOUND",
        });
      }

      finalProjectId = project._id;
    }

    const trimmedTitle =
      typeof title === "string" && title.trim().length > 0
        ? title.trim().slice(0, 100)
        : "New Conversation";

    const conversation = await Conversation.create({
      userId: req.user._id,
      projectId: finalProjectId,
      title: trimmedTitle,
      lastMessageAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    console.error(`[conversation] createConversation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
      code: "INTERNAL_ERROR",
    });
  }
};

const getConversations = async (req, res) => {
  try {
    const { projectId } = req.query;

    const filter = { userId: req.user._id };

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
          code: "INVALID_PROJECT_ID",
        });
      }
      filter.projectId = projectId;
    }

    const conversations = await Conversation.find(filter)
      .populate("projectId", "name status")
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    console.error(`[conversation] getConversations error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      code: "INTERNAL_ERROR",
    });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
        code: "INVALID_ID",
      });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({ conversationId: conversation._id });

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error(`[conversation] getConversationMessages error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      code: "INTERNAL_ERROR",
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
        code: "INVALID_ID",
      });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    const validation = conversationAssistantService.validateUserMessage(content);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        code: validation.code,
      });
    }

    let project = null;
    let tasks = [];
    let bugs = [];

    if (conversation.projectId) {
      project = await Project.findOne({
        _id: conversation.projectId,
        "members.user": req.user._id,
      }).select("name description status technologies");

      if (!project) {
        return res.status(403).json({
          success: false,
          message: "You no longer have access to this project",
          code: "FORBIDDEN",
        });
      }

      tasks = await Task.find({ project: project._id })
        .populate("assignee", "name")
        .lean();

      bugs = await Bug.find({ project: project._id })
        .populate("assignee", "name")
        .lean();
    }

    // Step 1: Persist user message first
    const userMessage = await Message.create({
      conversationId: conversation._id,
      userId: req.user._id,
      role: "user",
      content: validation.data,
    });

    // Auto-update conversation title from initial message if default
    if (conversation.title === "New Conversation") {
      const derivedTitle =
        validation.data.length > 50
          ? `${validation.data.slice(0, 47)}...`
          : validation.data;
      conversation.title = derivedTitle;
    }

    // Step 2: Fetch 10 prior messages in chronological order (excluding newly created user message)
    const priorMessages = await Message.find({
      conversationId: conversation._id,
      _id: { $ne: userMessage._id },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    priorMessages.reverse();

    // Step 3: Generate AI reply
    let aiReply;
    try {
      aiReply = await conversationAssistantService.generateConversationReply({
        project,
        tasks,
        bugs,
        priorMessages,
        currentUserMessage: validation.data,
      });
    } catch (aiError) {
      // AI failed: user message is already safely saved and NOT discarded
      conversation.lastMessageAt = new Date();
      await conversation.save();

      if (aiError instanceof AiError && ERROR_MAP[aiError.code]) {
        const mapped = ERROR_MAP[aiError.code];
        return res.status(mapped.status).json({
          success: false,
          message: mapped.message,
          code: mapped.code,
          data: { userMessage },
        });
      }

      return res.status(502).json({
        success: false,
        message: "AI provider is currently unavailable. Your message was saved.",
        code: "AI_PROVIDER_ERROR",
        data: { userMessage },
      });
    }

    // Step 4: Persist assistant response
    const assistantMessage = await Message.create({
      conversationId: conversation._id,
      userId: req.user._id,
      role: "assistant",
      content: aiReply.answer,
      metadata: {
        confidence: aiReply.confidence,
        sources: aiReply.sources,
      },
    });

    // Step 5: Update conversation activity timestamp
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return res.status(201).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
      },
    });
  } catch (error) {
    console.error(`[conversation] sendMessage error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      code: "INTERNAL_ERROR",
    });
  }
};

const renameConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
        code: "INVALID_ID",
      });
    }

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
        code: "TITLE_REQUIRED",
      });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    conversation.title = title.trim().slice(0, 100);
    await conversation.save();

    return res.status(200).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    console.error(`[conversation] renameConversation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to rename conversation",
      code: "INTERNAL_ERROR",
    });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
        code: "INVALID_ID",
      });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
        code: "CONVERSATION_NOT_FOUND",
      });
    }

    // Cascade delete all messages belonging to this conversation
    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error(`[conversation] deleteConversation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
      code: "INTERNAL_ERROR",
    });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  renameConversation,
  deleteConversation,
};
