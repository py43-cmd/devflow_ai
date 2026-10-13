const path = require("path");
const { scanAndRedactSecrets } = require("./secretScanner");

const EXTENSION_LANGUAGE_MAP = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".json": "json",
  ".sql": "sql",
  ".md": "markdown",
  ".markdown": "markdown",
  ".html": "html",
  ".css": "css",
  ".yaml": "yaml",
  ".yml": "yaml",
};

const detectLanguage = (filePath = "") => {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] || "text";
};

const parseCodeFile = ({ relativePath, content = "" }) => {
  const { cleanText } = scanAndRedactSecrets(content);
  const language = detectLanguage(relativePath);
  const lines = cleanText.split("\n");
  const lineCount = lines.length;

  const symbols = [];
  const imports = [];
  const exportsList = [];

  // Parse lines for imports, exports, functions, classes, and HTTP routes
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*")) {
      return;
    }

    // 1. Imports
    // CommonJS: const ... = require("...")
    const cjsRequireMatch = trimmed.match(/(?:const|let|var)\s+(?:{([^}]+)}|([a-zA-Z0-9_$]+))\s*=\s*require\(["']([^"']+)["']\)/);
    if (cjsRequireMatch) {
      imports.push({
        source: cjsRequireMatch[3],
        importedNames: (cjsRequireMatch[1] || cjsRequireMatch[2] || "").split(",").map((s) => s.trim()).filter(Boolean),
        line: lineNum,
      });
    }

    // ES6: import ... from "..."
    const es6ImportMatch = trimmed.match(/import\s+(?:(?:\*\s+as\s+([a-zA-Z0-9_$]+))|(?:{([^}]+)})|([a-zA-Z0-9_$]+))\s+from\s+["']([^"']+)["']/);
    if (es6ImportMatch) {
      imports.push({
        source: es6ImportMatch[4],
        importedNames: (es6ImportMatch[1] || es6ImportMatch[2] || es6ImportMatch[3] || "").split(",").map((s) => s.trim()).filter(Boolean),
        line: lineNum,
      });
    }

    // Python import
    const pyImportMatch = trimmed.match(/^(?:from\s+([a-zA-Z0-9_.]+)\s+import\s+([^#]+)|import\s+([a-zA-Z0-9_.]+))/);
    if (pyImportMatch && language === "python") {
      imports.push({
        source: pyImportMatch[1] || pyImportMatch[3],
        importedNames: pyImportMatch[2] ? pyImportMatch[2].split(",").map((s) => s.trim()) : [pyImportMatch[3]],
        line: lineNum,
      });
    }

    // 2. HTTP Routes (Express router.get("/...", handler) or app.post(...))
    const routeMatch = trimmed.match(/(?:router|app)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']\s*,\s*(?:[a-zA-Z0-9_$,\s]+,\s*)*([a-zA-Z0-9_$]+)/i);
    if (routeMatch) {
      const httpMethod = routeMatch[1].toUpperCase();
      const httpRoute = routeMatch[2];
      const handlerName = routeMatch[3];

      symbols.push({
        symbolName: `${httpMethod} ${httpRoute}`,
        symbolType: "route",
        startLine: lineNum,
        endLine: lineNum,
        httpMethod,
        httpRoute,
        signature: `${httpMethod} ${httpRoute} -> ${handlerName}`,
        isExported: true,
      });
    }

    // 3. Classes
    const classMatch = trimmed.match(/^(?:export\s+(?:default\s+)?)?class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+([a-zA-Z0-9_$.]+))?/);
    if (classMatch) {
      const className = classMatch[1];
      symbols.push({
        symbolName: className,
        symbolType: "class",
        startLine: lineNum,
        endLine: Math.min(lineCount, lineNum + 20),
        signature: trimmed.slice(0, 100),
        isExported: trimmed.includes("export"),
      });
    }

    // 4. Functions / Controllers / Methods
    // JS/TS: function foo(...)
    const fnMatch = trimmed.match(/^(?:export\s+(?:default\s+|async\s+)?)?(?:async\s+)?function\s*([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const fnName = fnMatch[1];
      symbols.push({
        symbolName: fnName,
        symbolType: fnName.toLowerCase().includes("controller") ? "controller" : "function",
        startLine: lineNum,
        endLine: Math.min(lineCount, lineNum + 15),
        signature: `${fnName}(${fnMatch[2].trim()})`,
        isExported: trimmed.includes("export"),
      });
    }

    // JS/TS: const foo = async (...) => ... or const foo = (...) => ...
    const arrowFnMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/);
    if (arrowFnMatch) {
      const fnName = arrowFnMatch[1];
      symbols.push({
        symbolName: fnName,
        symbolType: fnName.toLowerCase().includes("controller") ? "controller" : "function",
        startLine: lineNum,
        endLine: Math.min(lineCount, lineNum + 15),
        signature: `${fnName}(${arrowFnMatch[2].trim()})`,
        isExported: trimmed.includes("export"),
      });
    }

    // Python: def foo(...):
    const pyFnMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/);
    if (pyFnMatch && language === "python") {
      const fnName = pyFnMatch[1];
      symbols.push({
        symbolName: fnName,
        symbolType: "function",
        startLine: lineNum,
        endLine: Math.min(lineCount, lineNum + 15),
        signature: `def ${fnName}(${pyFnMatch[2].trim()})`,
        isExported: !fnName.startsWith("_"),
      });
    }

    // 5. Exports
    if (trimmed.startsWith("export ") || trimmed.startsWith("module.exports")) {
      exportsList.push({
        raw: trimmed.slice(0, 80),
        line: lineNum,
      });
    }
  });

  return {
    relativePath,
    language,
    lineCount,
    cleanText,
    symbols,
    imports,
    exportsList,
  };
};

module.exports = {
  detectLanguage,
  parseCodeFile,
  EXTENSION_LANGUAGE_MAP,
};
