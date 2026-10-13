import { useState, useRef } from "react";
import Button from "../common/Button";
import { uploadProjectDocument } from "../../services/documentService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".md",
  ".txt",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".json",
  ".sql",
  ".yaml",
  ".yml",
  ".html",
  ".css",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const DocumentUploadModal = ({ isOpen, onClose, projectId, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const validateFile = (selected) => {
    if (!selected) return null;

    const ext = "." + selected.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format (${ext}). Supported: PDF, Markdown, text, code, JSON, SQL, YAML.`;
    }

    if (selected.size > MAX_SIZE_BYTES) {
      return `File exceeds maximum size of 10MB (${(selected.size / (1024 * 1024)).toFixed(1)}MB).`;
    }

    return null;
  };

  const handleFileChange = (e) => {
    setError("");
    const selected = e.target.files?.[0];
    if (selected) {
      const valErr = validateFile(selected);
      if (valErr) {
        setError(valErr);
        setFile(null);
      } else {
        setFile(selected);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      const valErr = validateFile(dropped);
      if (valErr) {
        setError(valErr);
        setFile(null);
      } else {
        setFile(dropped);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !projectId || uploading) return;

    setUploading(true);
    setError("");

    try {
      await uploadProjectDocument(projectId, file);
      setFile(null);
      if (onUploaded) onUploaded();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={!uploading ? onClose : undefined}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Upload Project Knowledge</h3>
            <p className="text-xs text-zinc-400">
              Upload documents or source code to index into RAG vector memory.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              dragActive
                ? "border-indigo-500 bg-indigo-950/20"
                : file
                ? "border-emerald-600/60 bg-emerald-950/10"
                : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              onChange={handleFileChange}
              accept={ALLOWED_EXTENSIONS.join(",")}
              className="hidden"
            />

            {file ? (
              <div className="space-y-1 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-zinc-100 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
                <p className="text-[11px] text-indigo-400 hover:underline">Click or drop to replace</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    Drag and drop file here, or <span className="text-indigo-400 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    PDF, Markdown, JS, TS, Python, SQL, JSON, YAML up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {["PDF", "Markdown", "JavaScript", "TypeScript", "Python", "JSON", "SQL", "YAML"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] text-zinc-400"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={uploading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || uploading}
              className="text-xs flex items-center gap-1.5"
            >
              {uploading ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Indexing Knowledge...
                </>
              ) : (
                "Upload & Index"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
