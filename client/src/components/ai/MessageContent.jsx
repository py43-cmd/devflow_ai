import { useState } from "react";
import CopyButton from "../documentation/CopyButton";

export const MessageContent = ({ content = "" }) => {
  if (typeof content !== "string" || !content.trim()) {
    return null;
  }

  // Parse fenced code blocks vs standard text segments
  const segments = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "code",
      language: match[1]?.trim() || "code",
      value: match[2]?.replace(/\n$/, "") || "",
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      value: content.slice(lastIndex),
    });
  }

  const renderInlineFormatted = (text) => {
    // Process inline code `foo` and bold **bar**
    const parts = [];
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let curr = 0;
    let m;

    while ((m = inlineRegex.exec(text)) !== null) {
      if (m.index > curr) {
        parts.push(text.slice(curr, m.index));
      }

      const token = m[0];
      if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={`c-${curr}`}
            className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[12px] text-indigo-300"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={`b-${curr}`} className="font-semibold text-zinc-100">
            {token.slice(2, -2)}
          </strong>
        );
      }

      curr = m.index + token.length;
    }

    if (curr < text.length) {
      parts.push(text.slice(curr));
    }

    return parts;
  };

  const renderTextSegment = (text, segIndex) => {
    const lines = text.split("\n");

    return (
      <div key={`seg-${segIndex}`} className="space-y-1.5">
        {lines.map((line, lineIndex) => {
          const trimmed = line.trim();

          // Bullet point
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={lineIndex} className="flex items-start gap-2 pl-2">
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-200">{renderInlineFormatted(trimmed.slice(2))}</span>
              </div>
            );
          }

          // Numbered list
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={lineIndex} className="flex items-start gap-2 pl-2">
                <span className="font-mono text-xs text-zinc-500">{numMatch[1]}.</span>
                <span className="text-zinc-200">{renderInlineFormatted(numMatch[2])}</span>
              </div>
            );
          }

          // Header ###
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={lineIndex} className="pt-1 font-semibold text-zinc-100">
                {renderInlineFormatted(trimmed.slice(4))}
              </h4>
            );
          }

          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={lineIndex} className="pt-2 text-base font-bold text-zinc-100">
                {renderInlineFormatted(trimmed.slice(3))}
              </h3>
            );
          }

          if (trimmed.startsWith("# ")) {
            return (
              <h2 key={lineIndex} className="pt-2 text-lg font-bold text-zinc-100">
                {renderInlineFormatted(trimmed.slice(2))}
              </h2>
            );
          }

          if (!trimmed) {
            return <div key={lineIndex} className="h-1" />;
          }

          return (
            <p key={lineIndex} className="text-sm leading-relaxed text-zinc-200">
              {renderInlineFormatted(line)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3 text-sm">
      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return (
            <div
              key={`code-${i}`}
              className="my-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  {seg.language}
                </span>
                <CopyButton text={seg.value} label="Copy code" />
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-zinc-200">
                <code>{seg.value}</code>
              </pre>
            </div>
          );
        }

        return renderTextSegment(seg.value, i);
      })}
    </div>
  );
};

export default MessageContent;
