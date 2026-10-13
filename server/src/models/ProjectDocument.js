const mongoose = require("mongoose");

const projectDocumentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },

    storageKey: {
      type: String,
      required: true,
      trim: true,
    },

    contentHash: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["uploaded", "processing", "indexed", "failed"],
      default: "uploaded",
      index: true,
    },

    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
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

projectDocumentSchema.index({ projectId: 1, createdAt: -1 });
projectDocumentSchema.index({ projectId: 1, contentHash: 1 });

module.exports = mongoose.model("ProjectDocument", projectDocumentSchema);
