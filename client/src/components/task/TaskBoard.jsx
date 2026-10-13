import { useMemo } from "react";

import { STATUS_ORDER } from "../../utils/taskMeta";
import TaskColumn from "./TaskColumn";

const TaskBoard = ({ tasks, onTaskClick, onCreateTask }) => {
  const grouped = useMemo(() => {
    const map = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      }
    });

    return map;
  }, [tasks]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {STATUS_ORDER.map((column) => (
        <TaskColumn
          key={column.value}
          title={column.label}
          tasks={grouped[column.value]}
          onTaskClick={onTaskClick}
          onCreateTask={onCreateTask}
        />
      ))}
    </div>
  );
};

export default TaskBoard;
