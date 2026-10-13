const Project = require("../models/Project");

const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      technologies,
      repositoryUrl,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const project = await Project.create({
      name,
      description,
      technologies: technologies || [],
      repositoryUrl: repositoryUrl || "",
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "OWNER",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user._id,
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        projects,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project",
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const member = project.members.find(
      (member) =>
        member.user.toString() === req.user._id.toString()
    );

    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this project",
      });
    }

    const {
      name,
      description,
      technologies,
      repositoryUrl,
      status,
    } = req.body;

    if (name !== undefined) project.name = name;

    if (description !== undefined) {
      project.description = description;
    }

    if (technologies !== undefined) {
      project.technologies = technologies;
    }

    if (repositoryUrl !== undefined) {
      project.repositoryUrl = repositoryUrl;
    }

    if (status !== undefined) {
      project.status = status;
    }

    await project.save();

    return res.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you are not the owner",
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
