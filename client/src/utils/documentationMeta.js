export { formatDateTime } from "./taskMeta";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Mirrors the server-side input limits so the form can warn before submitting.
export const LIMITS = {
  path: 500,
  description: 3000,
  authentication: 500,
  requestBody: 10000,
  responseExample: 10000,
  errorExamples: 20,
  listItems: 50,
  name: 200,
  fieldDescription: 1000,
  errorMessage: 1000,
};

export const emptyParam = () => ({
  name: "",
  type: "string",
  required: false,
  description: "",
});

export const emptyError = () => ({ status: "", message: "" });

export const methodStyles = {
  GET: "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
  POST: "border-sky-900/60 bg-sky-950/40 text-sky-300",
  PUT: "border-amber-900/60 bg-amber-950/40 text-amber-300",
  PATCH: "border-violet-900/60 bg-violet-950/40 text-violet-300",
  DELETE: "border-red-900/60 bg-red-950/40 text-red-300",
  default: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
};

const prettyJson = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const renderParamTable = (title, params) => {
  if (!Array.isArray(params) || params.length === 0) {
    return "";
  }

  const rows = params
    .map((param) => {
      const required = param.required ? "yes" : "no";
      const description = (param.description || "").replace(/\|/g, "\\|");
      return `| ${param.name || "-"} | ${param.type || "string"} | ${required} | ${description} |`;
    })
    .join("\n");

  return [
    `**${title}**`,
    "",
    "| Name | Type | Required | Description |",
    "| --- | --- | --- | --- |",
    rows,
    "",
  ].join("\n");
};

export const formatDocumentationAsMarkdown = (doc) => {
  if (!doc) {
    return "";
  }

  const lines = [];

  lines.push(`# ${doc.title}`);
  lines.push("");
  lines.push(`\`${doc.method} ${doc.path}\``);
  lines.push("");
  lines.push(doc.summary);
  lines.push("");

  if (doc.authentication) {
    lines.push("## Authentication");
    lines.push("");
    lines.push(
      doc.authentication.required
        ? `Required. ${doc.authentication.description || ""}`.trim()
        : `Not required. ${doc.authentication.description || ""}`.trim(),
    );
    lines.push("");
  }

  lines.push("## Request");
  lines.push("");

  const headerTable = renderParamTable("Headers", doc.request?.headers);
  const pathTable = renderParamTable(
    "Path Parameters",
    doc.request?.pathParameters,
  );
  const queryTable = renderParamTable(
    "Query Parameters",
    doc.request?.queryParameters,
  );

  if (headerTable) lines.push(headerTable);
  if (pathTable) lines.push(pathTable);
  if (queryTable) lines.push(queryTable);

  if (doc.request?.body !== undefined && doc.request?.body !== null) {
    lines.push("**Body**");
    lines.push("");
    lines.push("```json");
    lines.push(prettyJson(doc.request.body));
    lines.push("```");
    lines.push("");
  }

  lines.push("## Responses");
  lines.push("");

  (doc.responses || []).forEach((response) => {
    lines.push(`- **${response.status}** — ${response.description || ""}`);
  });
  lines.push("");

  if (Array.isArray(doc.errors) && doc.errors.length > 0) {
    lines.push("## Errors");
    lines.push("");
    doc.errors.forEach((error) => {
      lines.push(`- **${error.status}** — ${error.description || ""}`);
    });
    lines.push("");
  }

  if (doc.exampleRequest) {
    lines.push("## Example Request");
    lines.push("");
    lines.push("```");
    lines.push(doc.exampleRequest);
    lines.push("```");
    lines.push("");
  }

  if (doc.exampleResponse) {
    lines.push("## Example Response");
    lines.push("");
    lines.push("```");
    lines.push(doc.exampleResponse);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n").trim();
};
