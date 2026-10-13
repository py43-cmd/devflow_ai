import { useMemo } from "react";

import ScoreMeter from "./ScoreMeter";
import ReviewIssueCard from "./ReviewIssueCard";
import { REVIEW_SEVERITIES } from "../../utils/codeReviewMeta";

const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const CodeReviewResults = ({ review }) => {
  const { summary, score, issues } = review;

  const counts = useMemo(() => {
    const base = {};
    REVIEW_SEVERITIES.forEach((severity) => {
      base[severity] = 0;
    });
    issues.forEach((issue) => {
      base[issue.severity] = (base[issue.severity] || 0) + 1;
    });
    return base;
  }, [issues]);

  const sortedIssues = useMemo(
    () =>
      [...issues].sort(
        (a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9),
      ),
    [issues],
  );

  return (
    <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Review Results
        </h3>
        <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] tracking-wide text-zinc-500">
          BETA
        </span>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Overall Score
        </p>
        <div className="mt-2">
          <ScoreMeter score={score} />
        </div>
        <p className="mt-4 text-sm text-zinc-300">{summary}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {REVIEW_SEVERITIES.map((severity) => (
          <div
            key={severity}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          >
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              {severity}
            </p>
            <p className="text-lg font-semibold text-zinc-100">
              {counts[severity] || 0}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {issues.length > 0
            ? `Issues (${issues.length})`
            : "Issues"}
        </h4>

        {issues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center">
            <p className="text-sm font-medium text-emerald-300">
              No issues found
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              The AI did not identify any problems in this code.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedIssues.map((issue, index) => (
              <ReviewIssueCard key={index} issue={issue} />
            ))}
          </div>
        )}
      </div>

      <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
        AI-generated review is advisory. Verify findings and suggestions before
        applying them to production code.
      </p>
    </div>
  );
};

export default CodeReviewResults;
