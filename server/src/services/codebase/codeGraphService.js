const path = require("path");

const resolveImportPath = (sourceFile, importSource, allFilePaths = new Set()) => {
  if (!importSource.startsWith(".")) {
    // Package or non-relative import (e.g. 'express', 'mongoose')
    return null;
  }

  const dir = path.dirname(sourceFile).replace(/\\/g, "/");
  const rawResolved = path.posix.normalize(path.posix.join(dir, importSource));

  // Try exact match
  if (allFilePaths.has(rawResolved)) {
    return rawResolved;
  }

  // Try extensions
  const extensions = [".js", ".jsx", ".ts", ".tsx", ".json", ".py"];
  for (const ext of extensions) {
    const candidate = `${rawResolved}${ext}`;
    if (allFilePaths.has(candidate)) {
      return candidate;
    }
  }

  // Try index files (e.g. ./controllers -> ./controllers/index.js)
  for (const ext of extensions) {
    const candidate = path.posix.join(rawResolved, `index${ext}`);
    if (allFilePaths.has(candidate)) {
      return candidate;
    }
  }

  return rawResolved;
};

const detectCircularDependencies = (adjacencyList = {}) => {
  const visited = new Set();
  const inStack = new Set();
  const circularCycles = [];

  const dfs = (node, pathArr) => {
    visited.add(node);
    inStack.add(node);
    pathArr.push(node);

    const neighbors = adjacencyList[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, pathArr);
      } else if (inStack.has(neighbor)) {
        const cycleStartIndex = pathArr.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycle = pathArr.slice(cycleStartIndex).concat(neighbor);
          circularCycles.push(cycle);
        }
      }
    }

    pathArr.pop();
    inStack.delete(node);
  };

  for (const node of Object.keys(adjacencyList)) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return circularCycles;
};

const buildRepositoryGraph = ({
  files = [],
  parsedMap = new Map(),
  repositoryId,
  projectId,
}) => {
  const allFilePaths = new Set(files.map((f) => f.relativePath));
  const relationships = [];
  const importAdjacency = {};

  // Initialize adjacency
  for (const file of files) {
    importAdjacency[file.relativePath] = [];
  }

  for (const file of files) {
    const parsed = parsedMap.get(file.relativePath);
    if (!parsed) continue;

    const sourcePath = file.relativePath;

    // 1. Process imports
    if (Array.isArray(parsed.imports)) {
      for (const imp of parsed.imports) {
        const targetResolved = resolveImportPath(sourcePath, imp.source, allFilePaths);

        if (targetResolved && allFilePaths.has(targetResolved)) {
          importAdjacency[sourcePath].push(targetResolved);

          relationships.push({
            repositoryId,
            projectId,
            sourceFile: sourcePath,
            targetFile: targetResolved,
            relationType: "imports",
            line: imp.line,
            confidence: "verified",
          });

          // Check if importing a model
          if (
            targetResolved.toLowerCase().includes("model") ||
            imp.importedNames.some((name) => /^[A-Z][a-zA-Z0-9]+$/.test(name))
          ) {
            relationships.push({
              repositoryId,
              projectId,
              sourceFile: sourcePath,
              targetFile: targetResolved,
              sourceSymbol: imp.importedNames[0] || "",
              relationType: "uses_model",
              line: imp.line,
              confidence: "inferred",
            });
          }
        }
      }
    }

    // 2. Process routes to handlers
    if (Array.isArray(parsed.symbols)) {
      for (const sym of parsed.symbols) {
        if (sym.symbolType === "route" && sym.httpRoute) {
          // Check if this route connects to an imported controller
          const routeText = sym.signature || "";
          const handlerCandidate = routeText.split("->")[1]?.trim();

          relationships.push({
            repositoryId,
            projectId,
            sourceFile: sourcePath,
            targetFile: sourcePath,
            sourceSymbol: sym.symbolName,
            targetSymbol: handlerCandidate || "",
            relationType: "routes_to",
            line: sym.startLine,
            confidence: "verified",
          });
        }
      }
    }
  }

  const circularCycles = detectCircularDependencies(importAdjacency);

  return {
    relationships,
    circularCycles,
  };
};

module.exports = {
  resolveImportPath,
  detectCircularDependencies,
  buildRepositoryGraph,
};
