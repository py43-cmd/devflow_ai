const mongoose = require("mongoose");

const codeFileSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    relativePath: {
      type: String,
      required: true,
      trim: true,
    },

    language: {
      type: String,
      default: "javascript",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    contentHash: {
      type: String,
      default: "",
      index: true,
    },

    lineCount: {
      type: Number,
      default: 0,
    },

    indexedCommitSha: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["indexed", "failed", "ignored"],
      default: "indexed",
    },
  },
  {
    timestamps: true,
  }
);

codeFileSchema.index({ repositoryId: 1, relativePath: 1 }, { unique: true });
codeFileSchema.index({ projectId: 1, relativePath: 1 });

module.exports = mongoose.model("CodeFile", codeFileSchema);
