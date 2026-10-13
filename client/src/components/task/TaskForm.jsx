import { useEffect, useState } from "react";

import { getProject } from "../../services/projectService";
import { createTask, updateTask } from "../../services/taskService";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { PRIORITIES, STATUS_ORDER } from "../../utils/taskMeta";
import Alert from "../common/Alert";
import Button from "../common/Button";
import Modal from "../common/Modal";
import TextField from "../common/TextField";

const emptyForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  assignee: "",
  tags: "",
  dueDate: "",
  estimatedHours: "",
  status: "TODO",
};

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const TaskForm = ({ isOpen, onClose, projectId, task, onSaved }) => {
  const isEditing = Boolean(task);
  const [form, setForm] = useState(emptyForm);
  const [members, setMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
        assignee: task.assignee?._id || task.assignee || "",
        tags: (task.tags || []).join(", "),
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
        estimatedHours:
          task.estimatedHours === 0 ? "0" : task.estimatedHours || "",
        status: task.status || "TODO",
      });
    } else {
      setForm(emptyForm);
    }

    setErrors({});
    setError("");
  }, [isOpen, task]);

  useEffect(() => {
    if (!isOpen || !projectId) {
      return undefined;
    }

    let active = true;

    const loadMembers = async () => {
      try {
        const data = await getProject(projectId);
        if (active) {
          setMembers(
            (data.data.project.members || [])
              .map((member) => member.user)
              .filter(Boolean),
          );
        }
      } catch {
        if (active) {
          setMembers([]);
        }
      }
    };

    loadMembers();

    return () => {
      active = false;
    };
  }, [isOpen, projectId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validate = () => {
    const next = {};

    if (form.title.trim().length < 2) {
      next.title = "Title must be at least 2 characters.";
    }

    if (
      form.estimatedHours !== "" &&
      (Number.isNaN(Number(form.estimatedHours)) ||
        Number(form.estimatedHours) < 0)
    ) {
      next.estimatedHours = "Estimated hours must be 0 or more.";
    }

    if (form.dueDate && Number.isNaN(Date.parse(form.dueDate))) {
      next.dueDate = "Enter a valid date.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      dueDate: form.dueDate ? form.dueDate : null,
      estimatedHours:
        form.estimatedHours === "" ? 0 : Number(form.estimatedHours),
    };

    payload.assignee = form.assignee || null;

    payload.status = form.status;

    try {
      if (isEditing) {
        await updateTask(task._id, payload);
      } else {
        await createTask(projectId, payload);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Task" : "Create Task"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert>{error}</Alert>

        <div className="space-y-1.5">
          <TextField
            id="title"
            label="Title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Implement authentication flow"
          />
          {errors.title ? (
            <p className="text-xs text-red-400">{errors.title}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Add more details about this task..."
            className={`${selectClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="priority" className="block text-sm font-medium text-zinc-300">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className={selectClass}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assignee" className="block text-sm font-medium text-zinc-300">
              Assignee
            </label>
            <select
              id="assignee"
              name="assignee"
              value={form.assignee}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-sm font-medium text-zinc-300">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className={selectClass}
          >
            {STATUS_ORDER.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <TextField
            id="tags"
            label="Tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="Comma separated, e.g. backend, urgent"
            required={false}
          />
          <p className="text-xs text-zinc-500">Separate multiple tags with commas.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="dueDate" className="block text-sm font-medium text-zinc-300">
              Due Date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              className={selectClass}
            />
            {errors.dueDate ? (
              <p className="text-xs text-red-400">{errors.dueDate}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="estimatedHours" className="block text-sm font-medium text-zinc-300">
              Estimated Hours
            </label>
            <input
              id="estimatedHours"
              name="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              value={form.estimatedHours}
              onChange={handleChange}
              placeholder="0"
              className={selectClass}
            />
            {errors.estimatedHours ? (
              <p className="text-xs text-red-400">{errors.estimatedHours}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskForm;
