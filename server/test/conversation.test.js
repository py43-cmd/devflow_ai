const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const conversationAssistantService = require("../src/services/ai/conversationAssistantService");
const { AiError } = require("../src/services/ai/aiProvider");
const Conversation = require("../src/models/Conversation");
const Message = require("../src/models/Message");

test("conversationAssistantService - validateUserMessage", async (t) => {
  await t.test("rejects non-string input", () => {
    const res = conversationAssistantService.validateUserMessage(123);
    assert.equal(res.valid, false);
    assert.equal(res.code, "INVALID_MESSAGE");
  });

  await t.test("rejects empty or whitespace-only messages", () => {
    const res = conversationAssistantService.validateUserMessage("   ");
    assert.equal(res.valid, false);
    assert.equal(res.code, "MESSAGE_REQUIRED");
  });

  await t.test("rejects messages exceeding 4000 characters", () => {
    const longText = "a".repeat(4001);
    const res = conversationAssistantService.validateUserMessage(longText);
    assert.equal(res.valid, false);
    assert.equal(res.code, "MESSAGE_TOO_LARGE");
  });

  await t.test("accepts valid message and trims", () => {
    const res = conversationAssistantService.validateUserMessage("  What tasks are due today?  ");
    assert.equal(res.valid, true);
    assert.equal(res.data, "What tasks are due today?");
  });
});

test("Conversation and Message schemas have required indexes and defaults", () => {
  // Check conversation schema defaults
  const conv = new Conversation({
    userId: "507f1f77bcf86cd799439011",
  });

  assert.equal(conv.title, "New Conversation");
  assert.equal(conv.projectId, null);
  assert.ok(conv.lastMessageAt instanceof Date);

  // Check message schema
  const msg = new Message({
    conversationId: "507f1f77bcf86cd799439011",
    userId: "507f1f77bcf86cd799439012",
    role: "user",
    content: "Hello AI",
  });

  assert.equal(msg.role, "user");
  assert.equal(msg.content, "Hello AI");
  assert.equal(msg.metadata.isError, false);
});

test("conversationController logic and authorization", async (t) => {
  const conversationController = require("../src/controllers/conversationController");

  await t.test("rejects invalid conversation ID in getConversationMessages", async () => {
    let statusCode = null;
    let responseBody = null;

    const req = {
      params: { id: "invalid-id" },
      user: { _id: "507f1f77bcf86cd799439011" },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await conversationController.getConversationMessages(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseBody.code, "INVALID_ID");
  });

  await t.test("rejects rename with empty title", async () => {
    let statusCode = null;
    let responseBody = null;

    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: { title: "   " },
      user: { _id: "507f1f77bcf86cd799439011" },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await conversationController.renameConversation(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseBody.code, "TITLE_REQUIRED");
  });

  await t.test("rejects sendMessage with invalid message body", async () => {
    // Mock Conversation.findOne to return a valid conversation
    const origFindOne = Conversation.findOne;
    Conversation.findOne = async () => ({
      _id: "507f1f77bcf86cd799439011",
      userId: "507f1f77bcf86cd799439012",
    });

    try {
      let statusCode = null;
      let responseBody = null;

      const req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: { content: "" },
        user: { _id: "507f1f77bcf86cd799439012" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
      };

      await conversationController.sendMessage(req, res);

      assert.equal(statusCode, 400);
      assert.equal(responseBody.code, "MESSAGE_REQUIRED");
    } finally {
      Conversation.findOne = origFindOne;
    }
  });

  await t.test("persists user message and does not discard it when AI provider fails", async () => {
    const origFindOne = Conversation.findOne;
    const origMsgCreate = Message.create;
    const origFind = Message.find;
    const origGenReply = conversationAssistantService.generateConversationReply;

    let savedUserMessage = null;

    try {
      const mockConv = {
        _id: "507f1f77bcf86cd799439011",
        userId: "507f1f77bcf86cd799439012",
        title: "Test Chat",
        projectId: null,
        lastMessageAt: new Date(),
        save: async () => {},
      };

      Conversation.findOne = async () => mockConv;

      Message.create = async (data) => {
        savedUserMessage = { _id: "msg-123", ...data };
        return savedUserMessage;
      };

      Message.find = () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [],
          }),
        }),
      });

      // Simulate AI failure
      conversationAssistantService.generateConversationReply = async () => {
        throw new AiError("AI_TIMEOUT", "AI timed out");
      };

      let statusCode = null;
      let responseBody = null;

      const req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: { content: "Will this fail gracefully?" },
        user: { _id: "507f1f77bcf86cd799439012" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
      };

      await conversationController.sendMessage(req, res);

      // Status 504 for timeout, user message saved and returned
      assert.equal(statusCode, 504);
      assert.equal(responseBody.code, "AI_TIMEOUT");
      assert.ok(responseBody.data?.userMessage);
      assert.equal(savedUserMessage.content, "Will this fail gracefully?");
    } finally {
      Conversation.findOne = origFindOne;
      Message.create = origMsgCreate;
      Message.find = origFind;
      conversationAssistantService.generateConversationReply = origGenReply;
    }
  });

  await t.test("successful message send saves user message, assistant reply, and updates conversation", async () => {
    const origFindOne = Conversation.findOne;
    const origMsgCreate = Message.create;
    const origFind = Message.find;
    const origGenReply = conversationAssistantService.generateConversationReply;

    const createdMessages = [];
    let convSaved = false;

    try {
      const mockConv = {
        _id: "507f1f77bcf86cd799439011",
        userId: "507f1f77bcf86cd799439012",
        title: "New Conversation",
        projectId: null,
        lastMessageAt: new Date(),
        save: async () => {
          convSaved = true;
        },
      };

      Conversation.findOne = async () => mockConv;

      Message.create = async (data) => {
        const item = { _id: `msg-${createdMessages.length}`, ...data };
        createdMessages.push(item);
        return item;
      };

      Message.find = () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [],
          }),
        }),
      });

      conversationAssistantService.generateConversationReply = async () => ({
        answer: "Here is your solution with ```javascript\nconsole.log('hi');\n```",
        confidence: 0.95,
        sources: [],
      });

      let statusCode = null;
      let responseBody = null;

      const req = {
        params: { id: "507f1f77bcf86cd799439011" },
        body: { content: "Show me code" },
        user: { _id: "507f1f77bcf86cd799439012" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
      };

      await conversationController.sendMessage(req, res);

      assert.equal(statusCode, 201);
      assert.equal(responseBody.success, true);
      assert.equal(createdMessages.length, 2);
      assert.equal(createdMessages[0].role, "user");
      assert.equal(createdMessages[1].role, "assistant");
      assert.equal(createdMessages[1].metadata.confidence, 0.95);
      assert.equal(convSaved, true);
      // Auto-title updated
      assert.equal(mockConv.title, "Show me code");
    } finally {
      Conversation.findOne = origFindOne;
      Message.create = origMsgCreate;
      Message.find = origFind;
      conversationAssistantService.generateConversationReply = origGenReply;
    }
  });

  await t.test("delete conversation cascades deletion to messages", async () => {
    const origFindOne = Conversation.findOne;
    const origDeleteMany = Message.deleteMany;
    const origFindByIdAndDelete = Conversation.findByIdAndDelete;

    let deletedMsgFilter = null;
    let deletedConvId = null;

    try {
      const mockConv = {
        _id: "507f1f77bcf86cd799439011",
        userId: "507f1f77bcf86cd799439012",
      };

      Conversation.findOne = async () => mockConv;
      Message.deleteMany = async (filter) => {
        deletedMsgFilter = filter;
      };
      Conversation.findByIdAndDelete = async (id) => {
        deletedConvId = id;
      };

      let statusCode = null;
      let responseBody = null;

      const req = {
        params: { id: "507f1f77bcf86cd799439011" },
        user: { _id: "507f1f77bcf86cd799439012" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
      };

      await conversationController.deleteConversation(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.deepEqual(deletedMsgFilter, { conversationId: mockConv._id });
      assert.equal(deletedConvId, mockConv._id);
    } finally {
      Conversation.findOne = origFindOne;
      Message.deleteMany = origDeleteMany;
      Conversation.findByIdAndDelete = origFindByIdAndDelete;
    }
  });
});
