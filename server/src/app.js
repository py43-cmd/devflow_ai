const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const bugRoutes = require("./routes/bugRoutes");
const aiRoutes = require("./routes/aiRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const documentRoutes = require("./routes/documentRoutes");

const app = express();

app.use(helmet());

// The Vite dev server can be reached as http://localhost:5173 or
// http://127.0.0.1:5173. The request Origin is echoed back for allowed
// origins (never for arbitrary origins), so login works from either host.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

// Bounded request body. Code review accepts up to 20k characters of code, so a
// modest cap keeps oversized payloads out without rejecting valid reviews.
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "DevFlow AI server is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api", taskRoutes);

app.use("/api", bugRoutes);

app.use("/api", aiRoutes);

app.use("/api/conversations", conversationRoutes);

app.use("/api/projects/:projectId/documents", documentRoutes);
app.use("/api/projects/:projectId/knowledge", documentRoutes);

// Consistent JSON errors for malformed or oversized request bodies.
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large",
      code: "PAYLOAD_TOO_LARGE",
    });
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
      code: "INVALID_JSON",
    });
  }

  return next(err);
});

module.exports = app;
