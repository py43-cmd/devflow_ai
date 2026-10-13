import { formatDate } from "../../utils/bugMeta";
import BugStatusBadge from "./BugStatusBadge";

const BugCard = ({ bug, onClick }) => {
  const assigneeName = bug.assignee?.name;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      <p className="line-clamp-2 text-sm font-medium text-zinc-100">
        {bug.title}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BugStatusBadge type="severity" value={bug.severity} />
        <BugStatusBadge type="status" value={bug.status} />
      </div>

      {bug.language ? (
        <p className="mt-3 text-xs text-zinc-400">
          <span className="text-zinc-500">Language:</span> {bug.language}
        </p>
      ) : null}

      {bug.errorMessage ? (
        <p className="mt-2 line-clamp-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-400">
          {bug.errorMessage}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-200">
            {assigneeName ? assigneeName.charAt(0).toUpperCase() : "?"}
          </span>
          <span className="text-[11px] text-zinc-400">
            {assigneeName || "Unassigned"}
          </span>
        </div>
        <span className="text-[11px] text-zinc-500">
          {formatDate(bug.createdAt)}
        </span>
      </div>

      <span className="mt-3 text-xs font-medium text-indigo-400">
        Open Bug <span aria-hidden="true">→</span>
      </span>
    </button>
  );
};

export default BugCard;
