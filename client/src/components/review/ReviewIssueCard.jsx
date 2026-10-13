import BugStatusBadge from "../bug/BugStatusBadge";
import CategoryBadge from "./CategoryBadge";

const ReviewIssueCard = ({ issue }) => {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <BugStatusBadge type="severity" value={issue.severity} />
        <CategoryBadge value={issue.category} />
        {issue.line ? (
          <span className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-zinc-400">
            Line {issue.line}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium text-zinc-100">{issue.problem}</p>

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Why it's a problem
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
            {issue.explanation}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Suggestion
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-200/90">
            {issue.suggestion}
          </p>
        </div>
      </div>
    </article>
  );
};

export default ReviewIssueCard;
