const mongoose = require("mongoose");

const codeRelationshipSchema = new mongoose.Schema(
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

    sourceFile: {
      type: String,
      required: true,
      trim: true,
    },

    targetFile: {
      type: String,
      required: true,
      trim: true,
    },

    sourceSymbol: {
      type: String,
      default: "",
    },

    targetSymbol: {
      type: String,
      default: "",
    },

    relationType: {
      type: String,
      enum: [
        "imports",
        "exports",
        "calls",
        "defines",
        "routes_to",
        "uses_model",
      ],
      required: true,
      index: true,
    },

    line: {
      type: Number,
      default: null,
    },

    confidence: {
      type: String,
      enum: ["verified", "inferred"],
      default: "verified",
    },
  },
  {
    timestamps: true,
  }
);

codeRelationshipSchema.index({ repositoryId: 1, sourceFile: 1 });
codeRelationshipSchema.index({ repositoryId: 1, targetFile: 1 });
codeRelationshipSchema.index({ projectId: 1, relationType: 1 });

module.exports = mongoose.model("CodeRelationship", codeRelationshipSchema);
