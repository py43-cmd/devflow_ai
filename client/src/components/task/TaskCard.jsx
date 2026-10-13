import { formatDate, priorityStyles } from "../../utils/taskMeta";

const TaskCard = ({ task, onClick }) => {
  const assigneeName = task.assignee?.name;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900/80"
    >
      <p className="text-sm font-medium text-zinc-100">{task.title}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${
            priorityStyles[task.priority] || priorityStyles.MEDIUM
          }`}
        >
          {task.priority}
        </span>
        {task.dueDate ? (
          <span className="text-[11px] text-zinc-500">
            Due {formatDate(task.dueDate)}
          </span>
        ) : null}
      </div>

      {task.tags?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[10px] text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {assigneeName ? (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-200">
            {assigneeName.charAt(0).toUpperCase()}
          </span>
          <span className="text-[11px] text-zinc-400">{assigneeName}</span>
        </div>
      ) : null}
    </button>
  );
};

export default TaskCard;
