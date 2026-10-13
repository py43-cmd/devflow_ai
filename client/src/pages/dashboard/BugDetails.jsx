import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import Modal from "../../components/common/Modal";
import BugStatusBadge from "../../components/bug/BugStatusBadge";
import BugForm from "../../components/bug/BugForm";
import { deleteBug, getBug, updateBug, analyzeBug } from "../../services/bugService";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { BUG_STATUSES, formatDateTime } from "../../utils/bugMeta";

const analysisFields = [
  { key: "summary", label: "Summary" },
  { key: "rootCause", label: "Root Cause" },
  { key: "explanation", label: "Explanation" },
  { key: "suggestedFix", label: "Suggested Fix" },
  { key: "prevention", label: "Prevention" },
];

const BugDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadBug = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getBug(id);
      setBug(data.data.bug);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBug();
  }, [loadBug]);

  const projectId = bug?.project?._id || bug?.project;
  const backTo = projectId ? `/bugs?project=${projectId}` : "/bugs";

  const handleStatusChange = async (event) => {
    const nextStatus = event.target.value;
    setStatusError("");
    setStatusSaving(true);

    try {
      const data = await updateBug(id, { status: nextStatus });
      setBug(data.data.bug);
    } catch (err) {
      setStatusError(getErrorMessage(err));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzeError("");
    setAnalyzing(true);

    try {
      const data = await analyzeBug(id);
      setBug((previous) =>
        previous ? { ...previous, aiAnalysis: data.data.analysis } : previous,
      );
    } catch (err) {
      setAnalyzeError(getErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    setDeleting(true);

    try {
      await deleteBug(id);
      navigate(backTo, { replace: true });
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loading label="Loading bug..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          to="/bugs"
          className="text-sm text-zinc-400 transition hover:text-zinc-100"
        >
          ← Back to bugs
        </Link>
        <EmptyState
          title="Unable to load bug"
          description={error}
          actionLabel="Retry"
          onAction={loadBug}
        />
      </div>
    );
  }

  if (!bug) {
    return null;
  }

  const metaRows = [
    { label: "Language", value: bug.language || "—" },
    { label: "Assignee", value: bug.assignee?.name || "Unassigned" },
    { label: "Reported by", value: bug.createdBy?.name || "Unknown" },
    { label: "Created", value: formatDateTime(bug.createdAt) },
    { label: "Last updated", value: formatDateTime(bug.updatedAt) },
  ];

  return (
    <div className="space-y-6">
      <Link
        to={backTo}
        className="text-sm text-zinc-400 transition hover:text-zinc-100"
      >
        ← Back to bugs
      </Link>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {bug.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <BugStatusBadge type="severity" value={bug.severity} />
              <BugStatusBadge type="status" value={bug.status} />
            </div>
          </div>

          <div className="flex shrink-0 gap-3">
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteError("");
                setConfirmOpen(true);
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor="status" className="text-xs uppercase tracking-wide text-zinc-500">
            Status
          </label>
          <select
            id="status"
            value={bug.status}
            onChange={handleStatusChange}
            disabled={statusSaving}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 sm:w-48"
          >
            {BUG_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {statusSaving ? (
            <span className="text-xs text-zinc-500">Saving...</span>
          ) : null}
        </div>
        {statusError ? (
          <p className="mt-2 text-xs text-red-400">{statusError}</p>
        ) : null}

        {bug.description ? (
          <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm text-zinc-300">
            {bug.description}
          </p>
        ) : (
          <p className="mt-5 text-sm text-zinc-600">No description</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Details
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metaRows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Error Message
        </h3>
        {bug.errorMessage ? (
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-red-300">
            {bug.errorMessage}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">No error message provided</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Source Code
        </h3>
        {bug.code ? (
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
            {bug.code}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">No code snippet provided</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            AI Bug Analysis
          </h3>
          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] tracking-wide text-zinc-500">
            BETA
          </span>
        </div>

        {analyzeError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
          >
            {analyzeError}
          </div>
        ) : null}

        {analyzing ? (
          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-2 text-sm text-zinc-200">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
              Analyzing the bug...
            </p>
            <ul className="space-y-1 text-xs text-zinc-500">
              <li>Reviewing error message</li>
              <li>Analyzing source code</li>
              <li>Identifying probable root cause</li>
              <li>Preparing suggested fix</li>
            </ul>
          </div>
        ) : bug.aiAnalysis ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {bug.aiAnalysis.severity === bug.severity
                    ? "Severity"
                    : "AI Suggested Severity"}
                </p>
                <div className="mt-1">
                  <BugStatusBadge
                    type="severity"
                    value={bug.aiAnalysis.severity}
                  />
                </div>
              </div>

              {bug.aiAnalysis.severity !== bug.severity ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Reported Severity
                  </p>
                  <div className="mt-1">
                    <BugStatusBadge type="severity" value={bug.severity} />
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Confidence
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-100">
                  {Math.round((bug.aiAnalysis.confidence || 0) * 100)}%
                </p>
              </div>
            </div>

            {analysisFields.map((field) => (
              <div key={field.key}>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {field.label}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
                  {bug.aiAnalysis[field.key]}
                </p>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
              <Button
                variant="secondary"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                Re-analyze
              </Button>
              <p className="text-xs text-zinc-500">
                AI-generated analysis is advisory. Verify suggested fixes before
                applying them to production code.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-zinc-500">
              No analysis yet. Generate an AI analysis of this bug.
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              Analyze Bug with AI
            </Button>
            <p className="text-xs text-zinc-500">
              AI-generated analysis is advisory. Verify suggested fixes before
              applying them to production code.
            </p>
          </div>
        )}
      </div>

      <BugForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        bug={bug}
        onSaved={loadBug}
      />

      <Modal
        isOpen={confirmOpen}
        onClose={() => (deleting ? null : setConfirmOpen(false))}
        title="Delete Bug?"
      >
        <div className="space-y-4">
          {deleteError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
            >
              {deleteError}
            </div>
          ) : null}

          <p className="text-sm text-zinc-300">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-100">{bug.title}</span>? This
            action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Bug"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BugDetails;
