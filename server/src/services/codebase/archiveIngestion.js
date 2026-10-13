const AdmZip = require("adm-zip");
const path = require("path");
const crypto = require("crypto");

class ArchiveSecurityError extends Error {
  constructor(message, code = "ARCHIVE_SECURITY_VIOLATION") {
    super(message);
    this.name = "ArchiveSecurityError";
    this.code = code;
  }
}

const MAX_TOTAL_ENTRIES = 1000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024; // 5MB

const IGNORE_PATTERNS = [
  /(^|\/)\.git\//i,
  /(^|\/)node_modules\//i,
  /(^|\/)dist\//i,
  /(^|\/)build\//i,
  /(^|\/)out\//i,
  /(^|\/)\.next\//i,
  /(^|\/)\.nuxt\//i,
  /(^|\/)__pycache__\//i,
  /(^|\/)\.venv\//i,
  /(^|\/)venv\//i,
  /(^|\/)\.idea\//i,
  /(^|\/)\.vscode\//i,
  /(^|\/)\.DS_Store$/i,
  /\.(exe|dll|so|dylib|bin|iso|dmg|zip|tar|gz|7z|rar|jpg|jpeg|png|gif|ico|webp|svg|mp3|mp4|mov|avi|pdf|wasm|pyc)$/i,
];

const shouldIgnorePath = (relPath = "") => {
  const normalized = relPath.replace(/\\/g, "/");
  return IGNORE_PATTERNS.some((pattern) => pattern.test(normalized));
};

const extractRepositoryArchive = (archiveBuffer) => {
  if (!Buffer.isBuffer(archiveBuffer) || archiveBuffer.length === 0) {
    throw new ArchiveSecurityError("Invalid or empty archive buffer", "INVALID_ARCHIVE");
  }

  let zip;
  try {
    zip = new AdmZip(archiveBuffer);
  } catch (err) {
    throw new ArchiveSecurityError("Failed to parse ZIP archive: invalid format", "CORRUPT_ZIP");
  }

  const entries = zip.getEntries();
  if (entries.length > MAX_TOTAL_ENTRIES) {
    throw new ArchiveSecurityError(
      `Archive contains too many entries (${entries.length}). Maximum allowed is ${MAX_TOTAL_ENTRIES}.`,
      "EXCEEDS_ENTRY_LIMIT"
    );
  }

  let totalUncompressedSize = 0;
  const validFiles = [];

  // Determine if all entries share a single root wrapper directory (e.g. "repo-main/")
  let commonPrefix = null;
  const nonDirectoryEntries = entries.filter((e) => !e.isDirectory);

  if (nonDirectoryEntries.length > 0) {
    const firstParts = nonDirectoryEntries[0].entryName.replace(/\\/g, "/").split("/");
    if (firstParts.length > 1) {
      const candidate = firstParts[0] + "/";
      const allShare = nonDirectoryEntries.every((e) =>
        e.entryName.replace(/\\/g, "/").startsWith(candidate)
      );
      if (allShare) {
        commonPrefix = candidate;
      }
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const rawName = entry.entryName.replace(/\\/g, "/");

    // Zip Slip / Path Traversal Guard
    if (rawName.includes("../") || rawName.includes("..\\") || path.isAbsolute(rawName)) {
      throw new ArchiveSecurityError(
        `Path traversal detected in archive entry: ${rawName}`,
        "PATH_TRAVERSAL"
      );
    }

    if (shouldIgnorePath(rawName)) {
      continue;
    }

    const uncompressedSize = entry.header.size;
    totalUncompressedSize += uncompressedSize;

    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new ArchiveSecurityError(
        "Archive uncompressed size exceeds maximum threshold (50MB)",
        "ZIP_BOMB_DETECTED"
      );
    }

    if (uncompressedSize > MAX_SINGLE_FILE_BYTES) {
      continue; // Skip oversized single files
    }

    // Strip common wrapper directory if present
    let relativePath = rawName;
    if (commonPrefix && relativePath.startsWith(commonPrefix)) {
      relativePath = relativePath.slice(commonPrefix.length);
    }

    relativePath = relativePath.replace(/^\/+/, "");
    if (!relativePath) continue;

    let contentString;
    try {
      const entryBuffer = entry.getData();
      contentString = entryBuffer.toString("utf-8");
    } catch {
      continue; // Skip binary / unreadable entries
    }

    const hash = crypto.createHash("sha256").update(contentString).digest("hex");

    validFiles.push({
      relativePath,
      content: contentString,
      size: uncompressedSize,
      hash,
    });
  }

  return {
    files: validFiles,
    totalFiles: validFiles.length,
    totalBytes: totalUncompressedSize,
  };
};

module.exports = {
  extractRepositoryArchive,
  shouldIgnorePath,
  ArchiveSecurityError,
  MAX_TOTAL_ENTRIES,
  MAX_TOTAL_UNCOMPRESSED_BYTES,
};
