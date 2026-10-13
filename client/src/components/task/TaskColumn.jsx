import TaskCard from "./TaskCard";

const TaskColumn = ({ title, tasks, onTaskClick, onCreateTask }) => {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </span>
        <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-600">No tasks</p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}

        {onCreateTask ? (
          <button
            type="button"
            onClick={onCreateTask}
            className="mt-1 rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-left text-xs text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            + Add task
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default TaskColumn;
