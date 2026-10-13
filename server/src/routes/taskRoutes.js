const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.use(protect);

// Project-specific tasks
router.post(
  "/projects/:projectId/tasks",
  createTask
);

router.get(
  "/projects/:projectId/tasks",
  getTasks
);

// Individual task
router.get("/tasks/:id", getTask);

router.put("/tasks/:id", updateTask);

router.delete("/tasks/:id", deleteTask);

module.exports = router;
