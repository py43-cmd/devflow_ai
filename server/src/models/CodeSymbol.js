const mongoose = require("mongoose");

const codeSymbolSchema = new mongoose.Schema(
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

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodeFile",
      required: true,
      index: true,
    },

    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    symbolName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    symbolType: {
      type: String,
      enum: [
        "function",
        "class",
        "method",
        "route",
        "controller",
        "interface",
        "variable",
      ],
      required: true,
      index: true,
    },

    startLine: {
      type: Number,
      required: true,
    },

    endLine: {
      type: Number,
      required: true,
    },

    parentSymbol: {
      type: String,
      default: null,
    },

    signature: {
      type: String,
      default: "",
    },

    httpMethod: {
      type: String,
      default: null,
    },

    httpRoute: {
      type: String,
      default: null,
    },

    isExported: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

codeSymbolSchema.index({ projectId: 1, symbolName: 1 });
codeSymbolSchema.index({ repositoryId: 1, filePath: 1 });
codeSymbolSchema.index({ projectId: 1, httpRoute: 1 });

module.exports = mongoose.model("CodeSymbol", codeSymbolSchema);
