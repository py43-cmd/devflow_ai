import { BUG_STATUSES, SEVERITIES } from "../../utils/bugMeta";
import Button from "../common/Button";

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 sm:w-44";

const BugFilters = ({ filters, onChange, members, onClear }) => {
  const hasActive = Boolean(
    filters.severity || filters.status || filters.assignee,
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        aria-label="Filter by severity"
        value={filters.severity}
        onChange={(event) => onChange("severity", event.target.value)}
        className={selectClass}
      >
        <option value="">All severities</option>
        {SEVERITIES.map((severity) => (
          <option key={severity} value={severity}>
            {severity}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(event) => onChange("status", event.target.value)}
        className={selectClass}
      >
        <option value="">All statuses</option>
        {BUG_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by assignee"
        value={filters.assignee}
        onChange={(event) => onChange("assignee", event.target.value)}
        className={selectClass}
      >
        <option value="">All assignees</option>
        {members.map((member) => (
          <option key={member._id} value={member._id}>
            {member.name}
          </option>
        ))}
      </select>

      {hasActive ? (
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
};

export default BugFilters;
