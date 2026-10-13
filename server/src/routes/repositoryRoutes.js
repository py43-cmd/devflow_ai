const express = require("express");
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const {
  registerOrUploadRepository,
  getRepositories,
  getRepositoryDetails,
  getRepositoryFileTree,
  getFilePreview,
  searchRepository,
  traceFlow,
  deleteRepository,
} = require("../controllers/repositoryController");

const router = express.Router({ mergeParams: true });

// Up to 25MB archive upload limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

router.use(protect);

router
  .route("/")
  .post(upload.single("archive"), registerOrUploadRepository)
  .get(getRepositories);

router
  .route("/:repositoryId")
  .get(getRepositoryDetails)
  .delete(deleteRepository);

router.get("/:repositoryId/tree", getRepositoryFileTree);
router.get("/:repositoryId/files/:fileId", getFilePreview);
router.post("/:repositoryId/search", searchRepository);
router.post("/:repositoryId/trace", traceFlow);

module.exports = router;
