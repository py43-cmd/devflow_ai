import { useState, useCallback, useEffect } from "react";
import Button from "../common/Button";
import DocumentUploadModal from "./DocumentUploadModal";
import {
  getProjectDocuments,
  retryDocumentIngestion,
  deleteProjectDocument,
} from "../../services/documentService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const statusBadge = (status) => {
  switch (status) {
    case "indexed":
      return "border-emerald-900/60 bg-emerald-950/40 text-emerald-300";
    case "processing":
      return "border-blue-900/60 bg-blue-950/40 text-blue-300 animate-pulse";
    case "failed":
      return "border-red-900/60 bg-red-950/40 text-red-300";
    default:
      return "border-amber-900/60 bg-amber-950/40 text-amber-300";
  }
};

export const ProjectDocumentsSection = ({ projectId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");

    try {
      const res = await getProjectDocuments(projectId);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleRetry = async (docId) => {
    setActionInProgress(docId);
    try {
      await retryDocumentIngestion(projectId, docId);
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (docId) => {
    setActionInProgress(docId);
    try {
      await deleteProjectDocument(projectId, docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      setDeletingId(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
  const indexedCount = documents.filter((d) => d.status === "indexed").length;

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                Project Knowledge & RAG Documents
              </h3>
              <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                {documents.length} docs · {totalChunks} chunks
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Uploaded files are chunked and vectorized for intelligent question answering.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => setUploadModalOpen(true)}
          className="text-xs shrink-0"
        >
          + Upload Document
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-500">Loading knowledge documents...</div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
          <svg
            className="mx-auto h-8 w-8 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-xs font-medium text-zinc-300">No project documents yet</p>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto mt-0.5">
            Upload architecture specs, code files, or API guides to enable grounded AI answers in chat.
          </p>
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Upload first document →
          </button>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden">
          {documents.map((doc) => {
            const isDeleting = deletingId === doc._id;
            const isWorking = actionInProgress === doc._id;

            return (
              <div
                key={doc._id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-900/30 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{doc.originalName}</p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>{formatSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      {doc.chunkCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400">{doc.chunkCount} vector chunks</span>
                        </>
                      )}
                    </div>
                    {doc.errorMessage && (
                      <p className="text-[11px] text-red-400 mt-0.5 truncate">{doc.errorMessage}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge(
                      doc.status
                    )}`}
                  >
                    {doc.status}
                  </span>

                  {doc.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => handleRetry(doc._id)}
                      disabled={isWorking}
                      className="rounded bg-indigo-900/30 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-900/60 transition disabled:opacity-50"
                    >
                      {isWorking ? "Retrying..." : "Retry"}
                    </button>
                  )}

                  {isDeleting ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(doc._id)}
                        disabled={isWorking}
                        className="rounded bg-red-700 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(doc._id)}
                      title="Delete document"
                      className="rounded p-1 text-zinc-500 hover:text-red-400 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projectId={projectId}
        onUploaded={loadDocuments}
      />
    </div>
  );
};

export default ProjectDocumentsSection;
