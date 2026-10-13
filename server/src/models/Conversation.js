const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: "New Conversation",
      maxlength: 100,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ userId: 1, projectId: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
