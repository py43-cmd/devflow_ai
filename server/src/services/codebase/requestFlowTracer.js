const CodeSymbol = require("../../models/CodeSymbol");
const CodeRelationship = require("../../models/CodeRelationship");
const CodeFile = require("../../models/CodeFile");

const traceRequestFlow = async ({ repositoryId, routeQuery = "" }) => {
  const query = routeQuery.trim().toLowerCase();
  const steps = [];

  // 1. Locate Route Symbol
  const routeSymbols = await CodeSymbol.find({
    repositoryId,
    symbolType: "route",
  }).lean();

  let matchedRouteSymbol = null;
  for (const sym of routeSymbols) {
    const routeText = (sym.symbolName || "").toLowerCase();
    const cleanHttpRoute = (sym.httpRoute || "").toLowerCase();

    if (
      routeText.includes(query) ||
      cleanHttpRoute.includes(query) ||
      query.includes(cleanHttpRoute)
    ) {
      matchedRouteSymbol = sym;
      break;
    }
  }

  if (matchedRouteSymbol) {
    steps.push({
      step: 1,
      type: "route",
      filePath: matchedRouteSymbol.filePath,
      line: matchedRouteSymbol.startLine,
      label: `Route definition: ${matchedRouteSymbol.symbolName}`,
      signature: matchedRouteSymbol.signature,
      confidence: "verified",
    });

    const routeFilePath = matchedRouteSymbol.filePath;

    // 2. Identify Middleware in that route file
    const routeRelationships = await CodeRelationship.find({
      repositoryId,
      sourceFile: routeFilePath,
    }).lean();

    const middlewareEdge = routeRelationships.find(
      (rel) =>
        rel.targetFile.toLowerCase().includes("middleware") ||
        rel.targetFile.toLowerCase().includes("auth")
    );

    if (middlewareEdge) {
      steps.push({
        step: 2,
        type: "middleware",
        filePath: middlewareEdge.targetFile,
        line: middlewareEdge.line || 1,
        label: `Authentication / Protection Middleware`,
        confidence: "verified",
      });
    }

    // 3. Trace to Controller
    const handlerCand = matchedRouteSymbol.signature.split("->")[1]?.trim() || "";
    let matchedController = null;

    if (handlerCand) {
      matchedController = await CodeSymbol.findOne({
        repositoryId,
        symbolName: handlerCand,
      }).lean();
    }

    if (!matchedController) {
      const controllerRel = routeRelationships.find((rel) =>
        rel.targetFile.toLowerCase().includes("controller")
      );
      if (controllerRel) {
        matchedController = await CodeSymbol.findOne({
          repositoryId,
          filePath: controllerRel.targetFile,
        }).lean();
      }
    }

    if (matchedController) {
      steps.push({
        step: 3,
        type: "controller",
        filePath: matchedController.filePath,
        line: matchedController.startLine,
        label: `Controller handler: ${matchedController.symbolName}`,
        confidence: "verified",
      });

      // 4. Trace Controller to Services and Models
      const controllerRels = await CodeRelationship.find({
        repositoryId,
        sourceFile: matchedController.filePath,
      }).lean();

      for (const rel of controllerRels) {
        if (rel.relationType === "uses_model" || rel.targetFile.toLowerCase().includes("model")) {
          steps.push({
            step: 4,
            type: "model",
            filePath: rel.targetFile,
            line: rel.line || 1,
            label: `Database Model access: ${rel.targetFile}`,
            confidence: "verified",
          });
        } else if (rel.targetFile.toLowerCase().includes("service")) {
          steps.push({
            step: 5,
            type: "service",
            filePath: rel.targetFile,
            line: rel.line || 1,
            label: `Business Service logic: ${rel.targetFile}`,
            confidence: "verified",
          });
        }
      }
    } else {
      steps.push({
        step: 3,
        type: "controller",
        filePath: routeFilePath,
        line: matchedRouteSymbol.startLine,
        label: "Controller handler inline or dynamically assigned",
        confidence: "unresolved",
      });
    }

    // 5. Look for matching test file
    const testFiles = await CodeFile.find({
      repositoryId,
      relativePath: { $regex: /(?:test|spec)/i },
    }).lean();

    const relatedTest = testFiles.find((tf) => {
      const base = tf.relativePath.toLowerCase();
      return (
        base.includes(routeFilePath.toLowerCase().split("/").pop().replace(".js", "").replace("routes", "")) ||
        (matchedController && base.includes(matchedController.filePath.toLowerCase().split("/").pop().replace(".js", "")))
      );
    });

    if (relatedTest) {
      steps.push({
        step: steps.length + 1,
        type: "test",
        filePath: relatedTest.relativePath,
        line: 1,
        label: `Related Test Suite: ${relatedTest.relativePath}`,
        confidence: "inferred",
      });
    }
  }

  return {
    query: routeQuery,
    found: Boolean(matchedRouteSymbol),
    steps,
    confidence: matchedRouteSymbol ? "verified" : "unresolved",
  };
};

module.exports = {
  traceRequestFlow,
};
