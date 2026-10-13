import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import Modal from "../../components/common/Modal";
import TaskForm from "../../components/task/TaskForm";
import { getTask, deleteTask } from "../../services/taskService";
import { getErrorMessage } from "../../utils/getErrorMessage";
import {
  formatDateTime,
  priorityStyles,
  statusLabel,
  statusStyles,
} from "../../utils/taskMeta";

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getTask(id);
      setTask(data.data.task);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const projectId = task?.project?._id || task?.project;
  const backTo = projectId ? `/tasks?project=${projectId}` : "/tasks";

  const handleDelete = async () => {
    setDeleteError("");
    setDeleting(true);

    try {
      await deleteTask(id);
      navigate(backTo, { replace: true });
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loading label="Loading task..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          to="/tasks"
          className="text-sm text-zinc-400 transition hover:text-zinc-100"
        >
          ← Back to tasks
        </Link>
        <EmptyState
          title="Unable to load task"
          description={error}
          actionLabel="Retry"
          onAction={loadTask}
        />
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const metaRows = [
    {
      label: "Assignee",
      value: task.assignee?.name || "Unassigned",
    },
    {
      label: "Reported by",
      value: task.createdBy?.name || "Unknown",
    },
    {
      label: "Due Date",
      value: formatDateTime(task.dueDate),
    },
    {
      label: "Estimated Hours",
      value: String(task.estimatedHours ?? 0),
    },
    {
      label: "Created",
      value: formatDateTime(task.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <Link
        to={backTo}
        className="text-sm text-zinc-400 transition hover:text-zinc-100"
      >
        ← Back to tasks
      </Link>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {task.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${
                  statusStyles[task.status] || statusStyles.TODO
                }`}
              >
                {statusLabel(task.status)}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${
                  priorityStyles[task.priority] || priorityStyles.MEDIUM
                }`}
              >
                {task.priority}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 gap-3">
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteError("");
                setConfirmOpen(true);
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        {task.description ? (
          <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm text-zinc-300">
            {task.description}
          </p>
        ) : (
          <p className="mt-5 text-sm text-zinc-600">No description</p>
        )}

        {task.tags?.length ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Details
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {metaRows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <TaskForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        task={task}
        onSaved={loadTask}
      />

      <Modal
        isOpen={confirmOpen}
        onClose={() => (deleting ? null : setConfirmOpen(false))}
        title="Delete Task?"
      >
        <div className="space-y-4">
          {deleteError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
            >
              {deleteError}
            </div>
          ) : null}

          <p className="text-sm text-zinc-300">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-100">{task.title}</span>?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Task"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskDetails;
