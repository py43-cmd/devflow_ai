const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  renameConversation,
  deleteConversation,
} = require("../controllers/conversationController");

const router = express.Router();

router.use(protect);

router.route("/")
  .post(createConversation)
  .get(getConversations);

router.route("/:id")
  .patch(renameConversation)
  .delete(deleteConversation);

router.route("/:id/messages")
  .get(getConversationMessages)
  .post(sendMessage);

module.exports = router;
