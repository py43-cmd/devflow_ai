const Bug = require("../models/Bug");
const Project = require("../models/Project");

const createBug = async (req, res) => {
  try {
    const { projectId } = req.params;

    const {
      title,
      description,
      severity,
      status,
      language,
      code,
      errorMessage,
      assignee,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Bug title is required",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (assignee) {
      const isMember = project.members.some(
        (member) =>
          member.user.toString() === assignee.toString()
      );

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Assignee is not a project member",
        });
      }
    }

    const bug = await Bug.create({
      project: projectId,
      title,
      description,
      severity,
      status,
      language,
      code,
      errorMessage,
      assignee: assignee || null,
      createdBy: req.user._id,
    });

    const populatedBug = await Bug.findById(bug._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      data: {
        bug: populatedBug,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create bug",
    });
  }
};

const getBugs = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const {
      status,
      severity,
      assignee,
    } = req.query;

    const filter = {
      project: projectId,
    };

    if (status) {
      filter.status = status;
    }

    if (severity) {
      filter.severity = severity;
    }

    if (assignee) {
      filter.assignee = assignee;
    }

    const bugs = await Bug.find(filter)
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        bugs,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bugs",
    });
  }
};

const getBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate("project", "name")
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    const project = await Project.findOne({
      _id: bug.project._id,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this bug",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        bug,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bug",
    });
  }
};

const updateBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    const project = await Project.findOne({
      _id: bug.project,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this bug",
      });
    }

    const {
      title,
      description,
      severity,
      status,
      language,
      code,
      errorMessage,
      assignee,
    } = req.body;

    if (assignee !== undefined) {
      if (assignee) {
        const isMember = project.members.some(
          (member) =>
            member.user.toString() === assignee.toString()
        );

        if (!isMember) {
          return res.status(400).json({
            success: false,
            message: "Assignee is not a project member",
          });
        }
      }

      bug.assignee = assignee || null;
    }

    if (title !== undefined) bug.title = title;

    if (description !== undefined) {
      bug.description = description;
    }

    if (severity !== undefined) {
      bug.severity = severity;
    }

    if (status !== undefined) {
      bug.status = status;
    }

    if (language !== undefined) {
      bug.language = language;
    }

    if (code !== undefined) {
      bug.code = code;
    }

    if (errorMessage !== undefined) {
      bug.errorMessage = errorMessage;
    }

    await bug.save();

    const updatedBug = await Bug.findById(bug._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      data: {
        bug: updatedBug,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update bug",
    });
  }
};

const deleteBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    const project = await Project.findOne({
      _id: bug.project,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this bug",
      });
    }

    await Bug.findByIdAndDelete(bug._id);

    return res.status(200).json({
      success: true,
      message: "Bug deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete bug",
    });
  }
};

module.exports = {
  createBug,
  getBugs,
  getBug,
  updateBug,
  deleteBug,
};
