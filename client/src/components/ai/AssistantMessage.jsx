import { useEffect, useRef } from "react";
import MessageContent from "./MessageContent";
import SourceCitations from "../knowledge/SourceCitations";

const AssistantMessage = ({ message, onRetry }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [message.content]);

  if (message.isError) {
    return (
      <div className="flex justify-start" ref={endRef}>
        <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-sm border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            AI Response Error
          </div>
          <p>{message.content}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded bg-red-900/40 px-2.5 py-1 text-xs font-medium text-red-200 transition hover:bg-red-900/70"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const confidenceValue =
    message.confidence !== undefined
      ? message.confidence
      : message.metadata?.confidence;
  const pct =
    confidenceValue !== undefined ? Math.round(confidenceValue * 100) : null;

  const rawSources = message.sources || message.metadata?.sources;
  const sources = Array.isArray(rawSources) ? rawSources : [];

  return (
    <div className="flex justify-start" ref={endRef}>
      <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            AI
          </span>
          <span className="text-xs font-medium text-zinc-500">Project AI Assistant</span>
        </div>

        <MessageContent content={message.content} />

        <SourceCitations sources={sources} />

        {pct !== null && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-zinc-500">AI confidence: {pct}%</span>
          </div>
        )}

        <p className="text-[11px] text-zinc-600">
          AI responses may contain mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
};

export default AssistantMessage;