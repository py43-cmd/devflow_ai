const mongoose = require("mongoose");

const bugSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },

    language: {
      type: String,
      trim: true,
      default: "",
    },

    code: {
      type: String,
      maxlength: 20000,
      default: "",
    },

    errorMessage: {
      type: String,
      maxlength: 5000,
      default: "",
    },

    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bugSchema.index({
  project: 1,
  status: 1,
});

bugSchema.index({
  project: 1,
  severity: 1,
});

module.exports = mongoose.model("Bug", bugSchema);
