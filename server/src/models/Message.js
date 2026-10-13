const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },

    metadata: {
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      sources: [
        {
          type: {
            type: String,
          },
          label: {
            type: String,
          },
          excerpt: {
            type: String,
            default: "",
          },
          documentId: {
            type: String,
            default: "",
          },
          pageNumber: {
            type: Number,
            default: null,
          },
          lineStart: {
            type: Number,
            default: null,
          },
          lineEnd: {
            type: Number,
            default: null,
          },
        },
      ],
      isError: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
