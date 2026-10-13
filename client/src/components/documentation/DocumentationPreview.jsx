import { useState } from "react";

import MethodBadge from "./MethodBadge";
import CopyButton from "./CopyButton";
import { formatDocumentationAsMarkdown } from "../../utils/documentationMeta";

const preClass =
  "overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300";

const sectionTitleClass =
  "mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400";

const pretty = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const ParamTable = ({ title, params }) => {
  if (!Array.isArray(params) || params.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="bg-zinc-950/60 text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Required</th>
              <th className="px-3 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {params.map((param, index) => (
              <tr key={index} className="border-t border-zinc-800">
                <td className="px-3 py-2 font-mono text-zinc-200">
                  {param.name || "—"}
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {param.type || "string"}
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {param.required ? "yes" : "no"}
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {param.description || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DocumentationPreview = ({ documentation }) => {
  const [view, setView] = useState("preview");

  const markdown = formatDocumentationAsMarkdown(documentation);
  const { authentication, request, responses, errors } = documentation;

  return (
    <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Generated Documentation
          </h3>
          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] tracking-wide text-zinc-500">
            BETA
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-zinc-800">
            {["preview", "markdown"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition ${
                  view === option
                    ? "bg-zinc-800 text-zinc-100"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <CopyButton text={markdown} label="Copy Markdown" />
        </div>
      </div>

      {view === "markdown" ? (
        <div>
          <p className="mb-2 text-xs text-zinc-500">
            Markdown preview — review before publishing.
          </p>
          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
            {markdown}
          </pre>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={documentation.method} />
              <code className="font-mono text-sm text-zinc-200">
                {documentation.path}
              </code>
            </div>
            <h4 className="mt-3 text-lg font-semibold text-zinc-50">
              {documentation.title}
            </h4>
            <p className="mt-1 text-sm text-zinc-300">
              {documentation.summary}
            </p>
          </div>

          {authentication ? (
            <div>
              <h4 className={sectionTitleClass}>Authentication</h4>
              <p className="text-sm text-zinc-300">
                <span
                  className={
                    authentication.required
                      ? "font-medium text-amber-300"
                      : "font-medium text-emerald-300"
                  }
                >
                  {authentication.required ? "Required" : "Not required"}
                </span>
                {authentication.description
                  ? ` — ${authentication.description}`
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            <h4 className={sectionTitleClass}>Request</h4>
            <ParamTable title="Headers" params={request?.headers} />
            <ParamTable
              title="Path Parameters"
              params={request?.pathParameters}
            />
            <ParamTable
              title="Query Parameters"
              params={request?.queryParameters}
            />
            {request?.body !== undefined && request?.body !== null ? (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Body
                </p>
                <pre className={preClass}>{pretty(request.body)}</pre>
              </div>
            ) : null}
          </div>

          <div>
            <h4 className={sectionTitleClass}>
              Responses ({responses?.length || 0})
            </h4>
            <div className="space-y-2">
              {(responses || []).map((response, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                      {response.status}
                    </span>
                    <span className="text-sm text-zinc-300">
                      {response.description || "—"}
                    </span>
                  </div>
                  {response.example !== undefined ? (
                    <pre className={`${preClass} mt-2`}>
                      {pretty(response.example)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {Array.isArray(errors) && errors.length > 0 ? (
            <div>
              <h4 className={sectionTitleClass}>Errors ({errors.length})</h4>
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                  >
                    <span className="rounded-md border border-red-900/60 bg-red-950/40 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-300">
                      {error.status}
                    </span>
                    <span className="text-sm text-zinc-300">
                      {error.description || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {documentation.exampleRequest ? (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Example Request
                  </h4>
                  <CopyButton text={documentation.exampleRequest} label="Copy" />
                </div>
                <pre className={preClass}>{documentation.exampleRequest}</pre>
              </div>
            ) : null}

            {documentation.exampleResponse ? (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Example Response
                  </h4>
                  <CopyButton
                    text={documentation.exampleResponse}
                    label="Copy"
                  />
                </div>
                <pre className={preClass}>{documentation.exampleResponse}</pre>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
        AI-generated documentation is advisory. Verify behavior and response
        shapes before publishing.
      </p>
    </div>
  );
};

export default DocumentationPreview;
