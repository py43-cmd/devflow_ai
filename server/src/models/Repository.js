const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["upload", "github", "gitlab"],
      default: "upload",
    },

    repositoryIdentifier: {
      type: String,
      trim: true,
      default: "",
    },

    defaultBranch: {
      type: String,
      trim: true,
      default: "main",
    },

    commitSha: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["uploaded", "indexing", "indexed", "failed"],
      default: "uploaded",
      index: true,
    },

    fileCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    symbolCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastIndexedAt: {
      type: Date,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

repositorySchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model("Repository", repositorySchema);
