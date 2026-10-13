import { useMemo, useState } from "react";

import Button from "../common/Button";
import ParamListEditor from "./ParamListEditor";
import ErrorListEditor from "./ErrorListEditor";
import {
  HTTP_METHODS,
  LIMITS,
  emptyError,
  emptyParam,
} from "../../utils/documentationMeta";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const labelClass = "mb-1 block text-xs uppercase tracking-wide text-zinc-500";

const parseJsonField = (raw) => {
  const value = (raw || "").trim();

  if (!value) {
    return { ok: true, value: undefined };
  }

  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false, value: undefined };
  }
};

const EndpointForm = ({ projects, projectsLoading, onSubmit, generating }) => {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [authentication, setAuthentication] = useState("");
  const [projectId, setProjectId] = useState("");

  const [requestHeaders, setRequestHeaders] = useState([]);
  const [queryParameters, setQueryParameters] = useState([]);
  const [pathParameters, setPathParameters] = useState([]);
  const [requestBody, setRequestBody] = useState("");
  const [responseExample, setResponseExample] = useState("");
  const [errorExamples, setErrorExamples] = useState([emptyError()]);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const requestBodyChars = requestBody.length;
  const responseExampleChars = responseExample.length;
  const overRequestBodyLimit = requestBodyChars > LIMITS.requestBody;
  const overResponseLimit = responseExampleChars > LIMITS.responseExample;

  const canSubmit = useMemo(
    () =>
      !generating &&
      path.trim().length > 0 &&
      description.trim().length > 0 &&
      !overRequestBodyLimit &&
      !overResponseLimit,
    [
      generating,
      path,
      description,
      overRequestBodyLimit,
      overResponseLimit,
    ],
  );

  const reset = () => {
    setMethod("GET");
    setPath("");
    setDescription("");
    setAuthentication("");
    setProjectId("");
    setRequestHeaders([]);
    setQueryParameters([]);
    setPathParameters([]);
    setRequestBody("");
    setResponseExample("");
    setErrorExamples([emptyError()]);
    setFormError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    if (!path.trim()) {
      setFormError("Path is required.");
      return;
    }

    if (path.trim().length > LIMITS.path) {
      setFormError(`Path exceeds the maximum of ${LIMITS.path} characters.`);
      return;
    }

    if (!description.trim()) {
      setFormError("Description is required.");
      return;
    }

    if (description.trim().length > LIMITS.description) {
      setFormError(
        `Description exceeds the maximum of ${LIMITS.description} characters.`,
      );
      return;
    }

    const parsedBody = parseJsonField(requestBody);

    if (!parsedBody.ok) {
      setFormError("Request body must be valid JSON.");
      return;
    }

    const parsedResponse = parseJsonField(responseExample);

    if (!parsedResponse.ok) {
      setFormError("Response example must be valid JSON.");
      return;
    }

    const cleanedErrors = errorExamples
      .filter((item) => String(item.status).trim() || item.message.trim())
      .map((item) => ({
        status: item.status === "" ? null : Number(item.status),
        message: item.message.trim(),
      }));

    const endpoint = {
      method,
      path: path.trim(),
      description: description.trim(),
      authentication: authentication.trim(),
      requestHeaders: requestHeaders.filter(
        (item) => item.name.trim() || item.description.trim(),
      ),
      queryParameters: queryParameters.filter(
        (item) => item.name.trim() || item.description.trim(),
      ),
      pathParameters: pathParameters.filter(
        (item) => item.name.trim() || item.description.trim(),
      ),
      errorExamples: cleanedErrors,
    };

    if (parsedBody.value !== undefined) {
      endpoint.requestBody = parsedBody.value;
    }

    if (parsedResponse.value !== undefined) {
      endpoint.responseExample = parsedResponse.value;
    }

    onSubmit({ endpoint, projectId });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
        <div>
          <label htmlFor="doc-method" className={labelClass}>
            Method
          </label>
          <select
            id="doc-method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className={inputClass}
          >
            {HTTP_METHODS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-path" className={labelClass}>
            Path
          </label>
          <input
            id="doc-path"
            type="text"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder="/api/projects/:id"
            spellCheck={false}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="doc-description" className={labelClass}>
          Description
        </label>
        <textarea
          id="doc-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="What does this endpoint do?"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="doc-auth" className={labelClass}>
            Authentication <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            id="doc-auth"
            type="text"
            value={authentication}
            onChange={(event) => setAuthentication(event.target.value)}
            placeholder="e.g. Bearer JWT required"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="doc-project" className={labelClass}>
            Project context <span className="text-zinc-600">(optional)</span>
          </label>
          <select
            id="doc-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            disabled={projectsLoading}
            className={inputClass}
          >
            <option value="">
              {projectsLoading ? "Loading projects..." : "No project context"}
            </option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-wide text-zinc-400 transition hover:text-zinc-200"
        >
          Advanced details
          <span className="text-zinc-600">{advancedOpen ? "▲" : "▼"}</span>
        </button>

        {advancedOpen ? (
          <div className="space-y-4 border-t border-zinc-800 p-4">
            <ParamListEditor
              label="Request Headers"
              params={requestHeaders}
              onChange={setRequestHeaders}
              max={LIMITS.listItems}
            />
            <ParamListEditor
              label="Query Parameters"
              params={queryParameters}
              onChange={setQueryParameters}
              max={LIMITS.listItems}
            />
            <ParamListEditor
              label="Path Parameters"
              params={pathParameters}
              onChange={setPathParameters}
              max={LIMITS.listItems}
            />

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="doc-body" className={labelClass}>
                  Request Body (JSON)
                </label>
                <span
                  className={`text-xs ${
                    overRequestBodyLimit ? "text-red-400" : "text-zinc-500"
                  }`}
                >
                  {requestBodyChars.toLocaleString()} /{" "}
                  {LIMITS.requestBody.toLocaleString()}
                </span>
              </div>
              <textarea
                id="doc-body"
                value={requestBody}
                onChange={(event) => setRequestBody(event.target.value)}
                rows={5}
                spellCheck={false}
                placeholder='{ "name": "string" }'
                className={`${inputClass} font-mono text-xs`}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="doc-response" className={labelClass}>
                  Response Example (JSON)
                </label>
                <span
                  className={`text-xs ${
                    overResponseLimit ? "text-red-400" : "text-zinc-500"
                  }`}
                >
                  {responseExampleChars.toLocaleString()} /{" "}
                  {LIMITS.responseExample.toLocaleString()}
                </span>
              </div>
              <textarea
                id="doc-response"
                value={responseExample}
                onChange={(event) => setResponseExample(event.target.value)}
                rows={5}
                spellCheck={false}
                placeholder='{ "id": "..." }'
                className={`${inputClass} font-mono text-xs`}
              />
            </div>

            <ErrorListEditor
              errors={errorExamples}
              onChange={setErrorExamples}
              max={LIMITS.errorExamples}
            />
          </div>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-xs text-red-400">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {generating ? "Generating..." : "Generate Documentation"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={reset}
          disabled={generating}
        >
          Reset
        </Button>
        <p className="text-xs text-zinc-500">
          AI-generated docs are advisory. Review before publishing.
        </p>
      </div>
    </form>
  );
};

export default EndpointForm;
