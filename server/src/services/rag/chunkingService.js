const crypto = require("crypto");

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 150;
const MIN_CHUNK_SIZE = 50;

const computeHash = (text) => {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
};

const findLineNumber = (fullText, charIndex) => {
  const substring = fullText.slice(0, charIndex);
  return substring.split("\n").length;
};

const chunkDocument = ({
  text = "",
  pages = [],
  originalName = "",
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP,
} = {}) => {
  if (!text || !text.trim()) {
    return [];
  }

  const chunks = [];
  let chunkIndex = 0;

  // If page metadata exists with multiple pages (e.g. PDF)
  if (Array.isArray(pages) && pages.length > 1) {
    for (const page of pages) {
      const pageText = page.content.trim();
      if (!pageText) continue;

      const pageChunks = splitTextIntoChunks({
        text: pageText,
        originalName,
        pageNumber: page.pageNumber,
        startIndexOffset: chunkIndex,
        chunkSize,
        chunkOverlap,
      });

      chunks.push(...pageChunks);
      chunkIndex += pageChunks.length;
    }

    return chunks;
  }

  // Single page or source code / markdown document
  return splitTextIntoChunks({
    text: text.trim(),
    originalName,
    pageNumber: 1,
    startIndexOffset: 0,
    chunkSize,
    chunkOverlap,
  });
};

const splitTextIntoChunks = ({
  text,
  originalName,
  pageNumber = 1,
  startIndexOffset = 0,
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP,
}) => {
  const chunks = [];
  const lines = text.split("\n");

  let currentHeading = "";
  let currentChunkLines = [];
  let currentChunkCharCount = 0;
  let chunkStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect Markdown headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      currentHeading = headingMatch[2].trim();
    }

    const lineLength = line.length + 1; // +1 for newline

    // If adding this line exceeds chunk size and we already have minimum content
    if (
      currentChunkCharCount + lineLength > chunkSize &&
      currentChunkCharCount >= MIN_CHUNK_SIZE
    ) {
      const chunkContent = currentChunkLines.join("\n").trim();
      if (chunkContent.length >= MIN_CHUNK_SIZE) {
        chunks.push({
          chunkIndex: startIndexOffset + chunks.length,
          content: chunkContent,
          sourceMetadata: {
            filename: originalName,
            pageNumber,
            lineStart: chunkStartLine,
            lineEnd: lineNum - 1,
            heading: currentHeading || "",
          },
          contentHash: computeHash(chunkContent),
        });
      }

      // Calculate overlap: keep recent lines up to chunkOverlap characters
      let overlapCount = 0;
      const overlapLines = [];
      for (let j = currentChunkLines.length - 1; j >= 0; j--) {
        const prevLine = currentChunkLines[j];
        if (overlapCount + prevLine.length + 1 > chunkOverlap) break;
        overlapLines.unshift(prevLine);
        overlapCount += prevLine.length + 1;
      }

      currentChunkLines = [...overlapLines, line];
      currentChunkCharCount = overlapCount + lineLength;
      chunkStartLine = Math.max(1, lineNum - overlapLines.length);
    } else {
      if (currentChunkLines.length === 0) {
        chunkStartLine = lineNum;
      }
      currentChunkLines.push(line);
      currentChunkCharCount += lineLength;
    }
  }

  // Push remaining chunk
  if (currentChunkLines.length > 0) {
    const chunkContent = currentChunkLines.join("\n").trim();
    if (chunkContent.length > 0) {
      chunks.push({
        chunkIndex: startIndexOffset + chunks.length,
        content: chunkContent,
        sourceMetadata: {
          filename: originalName,
          pageNumber,
          lineStart: chunkStartLine,
          lineEnd: lines.length,
          heading: currentHeading || "",
        },
        contentHash: computeHash(chunkContent),
      });
    }
  }

  return chunks;
};

module.exports = {
  chunkDocument,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  computeHash,
};
