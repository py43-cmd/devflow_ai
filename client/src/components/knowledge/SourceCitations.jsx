import { useState } from "react";

export const SourceCitations = ({ sources = [] }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  const toggleExpand = (idx) => {
    setExpandedIndex((current) => (current === idx ? null : idx));
  };

  return (
    <div className="border-t border-zinc-800/80 pt-2.5 mt-2 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
        <svg
          className="h-3.5 w-3.5 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>Grounded in project sources ({sources.length}):</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, index) => {
          const isDoc = source.type === "document";
          const isExpanded = expandedIndex === index;
          const hasExcerpt = Boolean(source.excerpt);

          return (
            <div key={index} className="w-full sm:w-auto">
              <button
                type="button"
                onClick={() => hasExcerpt && toggleExpand(index)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition ${
                  isDoc
                    ? "border-indigo-900/60 bg-indigo-950/30 text-indigo-300 hover:border-indigo-700/80 hover:bg-indigo-900/30"
                    : source.type === "bug"
                    ? "border-red-900/60 bg-red-950/30 text-red-300"
                    : source.type === "task"
                    ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                } ${hasExcerpt ? "cursor-pointer" : "cursor-default"}`}
              >
                {isDoc ? (
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-zinc-500">
                    {source.type}
                  </span>
                )}

                <span className="font-medium truncate max-w-xs">{source.label}</span>

                {hasExcerpt && (
                  <svg
                    className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {isExpanded && hasExcerpt && (
                <div className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                  <div className="flex items-center justify-between pb-1 text-[10px] font-sans font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60 mb-1.5">
                    <span>Excerpt from {source.label}</span>
                    {source.pageNumber && <span>Page {source.pageNumber}</span>}
                    {source.lineStart && (
                      <span>Lines {source.lineStart}-{source.lineEnd}</span>
                    )}
                  </div>
                  {source.excerpt}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SourceCitations;
