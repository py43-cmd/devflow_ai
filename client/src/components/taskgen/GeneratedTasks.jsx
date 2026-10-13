import Button from "../common/Button";
import CopyButton from "../documentation/CopyButton";
import GeneratedTaskCard from "./GeneratedTaskCard";
import { formatTasksAsMarkdown } from "../../utils/taskGeneratorMeta";

const GeneratedTasks = ({
  generated,
  selected,
  onToggle,
  onToggleAll,
  onCreateSelected,
  creating,
}) => {
  const tasks = generated.tasks || [];
  const selectedCount = selected.filter(Boolean).length;
  const allSelected = tasks.length > 0 && selectedCount === tasks.length;

  return (
    <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Generated Tasks ({tasks.length})
          </h3>
          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] tracking-wide text-zinc-500">
            BETA
          </span>
        </div>
        <CopyButton text={formatTasksAsMarkdown(generated)} label="Copy Markdown" />
      </div>

      {generated.summary ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-sm text-zinc-300">{generated.summary}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-zinc-800 py-3">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-indigo-500"
          />
          Select all ({selectedCount}/{tasks.length})
        </label>

        <Button
          type="button"
          onClick={onCreateSelected}
          disabled={creating || selectedCount === 0}
        >
          {creating
            ? "Creating..."
            : `Create ${selectedCount} selected task${selectedCount === 1 ? "" : "s"}`}
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <GeneratedTaskCard
            key={index}
            task={task}
            index={index}
            selected={Boolean(selected[index])}
            onToggle={onToggle}
          />
        ))}
      </div>

      <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
        AI-generated tasks are suggestions. Review and adjust them before
        creating. Unchecked tasks are not created.
      </p>
    </div>
  );
};

export default GeneratedTasks;
