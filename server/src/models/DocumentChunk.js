const mongoose = require("mongoose");

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectDocument",
      required: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    embedding: {
      type: [Number],
      default: [],
    },

    sourceMetadata: {
      filename: {
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
      heading: {
        type: String,
        default: "",
      },
    },

    contentHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

documentChunkSchema.index({ projectId: 1, documentId: 1 });
documentChunkSchema.index({ projectId: 1, chunkIndex: 1 });

module.exports = mongoose.model("DocumentChunk", documentChunkSchema);
