const Task = require("../models/Task");
const Project = require("../models/Project");

const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;

    const {
      title,
      description,
      status,
      priority,
      assignee,
      tags,
      dueDate,
      estimatedHours,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // Verify project membership
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

    // If assigning to someone, verify they belong to project
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

    const task = await Task.create({
      project: projectId,
      title,
      description,
      status,
      priority,
      assignee: assignee || null,
      createdBy: req.user._id,
      tags: tags || [],
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || 0,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
};

const getTasks = async (req, res) => {
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
      priority,
      assignee,
    } = req.query;

    const filter = {
      project: projectId,
    };

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignee) {
      filter.assignee = assignee;
    }

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        tasks,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
};

const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("project", "name")
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const project = await Project.findOne({
      _id: task.project._id,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this task",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task",
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const project = await Project.findOne({
      _id: task.project,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this task",
      });
    }

    const {
      title,
      description,
      status,
      priority,
      assignee,
      tags,
      dueDate,
      estimatedHours,
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

      task.assignee = assignee || null;
    }

    if (title !== undefined) task.title = title;

    if (description !== undefined) {
      task.description = description;
    }

    if (status !== undefined) task.status = status;

    if (priority !== undefined) task.priority = priority;

    if (tags !== undefined) task.tags = tags;

    if (dueDate !== undefined) task.dueDate = dueDate;

    if (estimatedHours !== undefined) {
      task.estimatedHours = estimatedHours;
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const project = await Project.findOne({
      _id: task.project,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this task",
      });
    }

    await Task.findByIdAndDelete(task._id);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};
