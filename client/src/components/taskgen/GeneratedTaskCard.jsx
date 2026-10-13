import CopyButton from "../documentation/CopyButton";
import { priorityStyles, formatTaskAsMarkdown } from "../../utils/taskGeneratorMeta";

const GeneratedTaskCard = ({ task, index, selected, onToggle }) => {
  const styles = priorityStyles[task.priority] || priorityStyles.MEDIUM;

  return (
    <div
      className={`rounded-lg border bg-zinc-950/60 p-4 transition ${
        selected ? "border-indigo-700/60" : "border-zinc-800"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          id={`gen-task-${index}`}
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(index)}
          className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-indigo-500"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={`gen-task-${index}`}
              className="text-sm font-semibold text-zinc-100"
            >
              {task.title}
            </label>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${styles}`}
            >
              {task.priority}
            </span>
            <span className="text-xs text-zinc-500">
              {task.estimatedHours}h est.
            </span>
          </div>

          {task.description ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
              {task.description}
            </p>
          ) : null}

          {Array.isArray(task.tags) && task.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {task.tags.map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {Array.isArray(task.subtasks) && task.subtasks.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-zinc-500">
              {task.subtasks.map((subtask, subtaskIndex) => (
                <li key={subtaskIndex}>{subtask}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <CopyButton
          text={formatTaskAsMarkdown(task)}
          label="Copy"
          className="shrink-0"
        />
      </div>
    </div>
  );
};

export default GeneratedTaskCard;
