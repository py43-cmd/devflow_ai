const express = require("express");

const protect = require("../middleware/authMiddleware");
const {
  analyzeBug,
  reviewCode,
  generateDocumentation,
  generateTasks,
  projectAssistant,
} = require("../controllers/aiController");

const router = express.Router();

router.use(protect);

// POST /api/bugs/:id/analyze
router.post("/bugs/:id/analyze", analyzeBug);

// POST /api/code-review
router.post("/code-review", reviewCode);

// POST /api/ai/documentation
router.post("/ai/documentation", generateDocumentation);

// POST /api/ai/tasks/generate
router.post("/ai/tasks/generate", generateTasks);

// POST /api/projects/:projectId/ai/assistant
router.post("/projects/:projectId/ai/assistant", projectAssistant);

module.exports = router;
