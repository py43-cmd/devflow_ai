const express = require("express");
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getDocuments,
  getDocument,
  getDocumentStatus,
  retryDocumentIngestion,
  deleteDocument,
  searchProjectKnowledge,
} = require("../controllers/documentController");

const router = express.Router({ mergeParams: true });

// Configure multer with memory storage and 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.use(protect);

// Document endpoints under /api/projects/:projectId/documents
router
  .route("/")
  .post(upload.single("file"), uploadDocument)
  .get(getDocuments);

router
  .route("/:documentId")
  .get(getDocument)
  .delete(deleteDocument);

router.get("/:documentId/status", getDocumentStatus);
router.post("/:documentId/retry", retryDocumentIngestion);

// Knowledge search under /api/projects/:projectId/knowledge/search
// We can also route this here or as a sibling route
router.post("/search", searchProjectKnowledge);

module.exports = router;
