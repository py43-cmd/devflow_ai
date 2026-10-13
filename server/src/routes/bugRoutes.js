const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createBug,
  getBugs,
  getBug,
  updateBug,
  deleteBug,
} = require("../controllers/bugController");

const router = express.Router();

router.use(protect);

router.post(
  "/projects/:projectId/bugs",
  createBug
);

router.get(
  "/projects/:projectId/bugs",
  getBugs
);

router.get("/bugs/:id", getBug);

router.put("/bugs/:id", updateBug);

router.delete("/bugs/:id", deleteBug);

module.exports = router;
