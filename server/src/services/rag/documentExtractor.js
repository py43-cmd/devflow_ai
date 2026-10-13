const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

class ExtractionError extends Error {
  constructor(message, code = "EXTRACTION_FAILED") {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
  }
}

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".md",
  ".markdown",
  ".txt",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".json",
  ".sql",
  ".html",
  ".htm",
  ".css",
  ".yaml",
  ".yml",
  ".xml",
  ".env.example",
]);

const getFileExtension = (filename = "") => {
  return path.extname(filename).toLowerCase();
};

const isSupportedFile = (filename = "") => {
  const ext = getFileExtension(filename);
  return SUPPORTED_EXTENSIONS.has(ext);
};

const normalizeText = (raw = "") => {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // strip unprintable non-text chars
};

const extractPdf = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    const text = normalizeText(data.text).trim();

    if (!text || text.length < 5) {
      throw new ExtractionError(
        "PDF contains no readable text. Scanned or image-only documents require OCR.",
        "OCR_REQUIRED"
      );
    }

    const numPages = data.numpages || 1;
    // Split text into approximate pages if markers exist or distribute evenly
    const pages = [];
    const pageSplits = text.split(/\f/); // form feed characters often separate PDF pages

    if (pageSplits.length >= numPages) {
      pageSplits.forEach((pText, idx) => {
        const clean = pText.trim();
        if (clean) {
          pages.push({ pageNumber: idx + 1, content: clean });
        }
      });
    } else {
      pages.push({ pageNumber: 1, content: text });
    }

    return {
      text,
      pages,
      type: "pdf",
    };
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(`Failed to extract text from PDF: ${err.message}`, "PDF_PARSE_ERROR");
  }
};

const extractJson = (content) => {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch (err) {
    throw new ExtractionError("Invalid JSON document: malformed syntax", "MALFORMED_JSON");
  }
};

const extractDocumentText = async (filePathOrBuffer, metadata = {}) => {
  const originalName = metadata.originalName || "document";
  const ext = getFileExtension(originalName);

  if (!isSupportedFile(originalName)) {
    throw new ExtractionError(
      `Unsupported file type: ${ext || "unknown"}. Supported formats: PDF, Markdown, text, code, JSON, SQL, YAML.`,
      "UNSUPPORTED_TYPE"
    );
  }

  let buffer;
  if (Buffer.isBuffer(filePathOrBuffer)) {
    buffer = filePathOrBuffer;
  } else if (typeof filePathOrBuffer === "string") {
    if (!fs.existsSync(filePathOrBuffer)) {
      throw new ExtractionError("Document file not found on disk", "FILE_NOT_FOUND");
    }
    buffer = await fs.promises.readFile(filePathOrBuffer);
  } else {
    throw new ExtractionError("Invalid document input", "INVALID_INPUT");
  }

  if (buffer.length === 0) {
    throw new ExtractionError("Uploaded document is empty (0 bytes)", "EMPTY_FILE");
  }

  // Handle PDF
  if (ext === ".pdf") {
    return extractPdf(buffer);
  }

  // Handle Text/Code files
  const rawContent = buffer.toString("utf-8");
  const text = normalizeText(rawContent).trim();

  if (!text) {
    throw new ExtractionError("Document contains no readable text", "EMPTY_CONTENT");
  }

  if (ext === ".json") {
    const formattedJson = extractJson(text);
    return {
      text: formattedJson,
      pages: [{ pageNumber: 1, content: formattedJson }],
      type: "json",
    };
  }

  return {
    text,
    pages: [{ pageNumber: 1, content: text }],
    type: ext.startsWith(".") ? ext.slice(1) : "text",
  };
};

module.exports = {
  extractDocumentText,
  isSupportedFile,
  getFileExtension,
  SUPPORTED_EXTENSIONS,
  ExtractionError,
};
