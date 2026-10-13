import { useEffect, useState } from "react";

import { getProject } from "../../services/projectService";
import { createBug, updateBug } from "../../services/bugService";
import { getErrorMessage } from "../../utils/getErrorMessage";
import {
  BUG_STATUSES,
  CODE_LIMIT,
  ERROR_MESSAGE_LIMIT,
  LANGUAGES,
  SEVERITIES,
} from "../../utils/bugMeta";
import Alert from "../common/Alert";
import Button from "../common/Button";
import Modal from "../common/Modal";
import TextField from "../common/TextField";

const emptyForm = {
  title: "",
  description: "",
  severity: "MEDIUM",
  language: "",
  errorMessage: "",
  code: "",
  assignee: "",
  status: "OPEN",
};

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const countClass = "text-xs text-zinc-500";

const BugForm = ({ isOpen, onClose, projectId, bug, onSaved }) => {
  const isEditing = Boolean(bug);
  const [form, setForm] = useState(emptyForm);
  const [members, setMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (bug) {
      setForm({
        title: bug.title || "",
        description: bug.description || "",
        severity: bug.severity || "MEDIUM",
        language: bug.language || "",
        errorMessage: bug.errorMessage || "",
        code: bug.code || "",
        assignee: bug.assignee?._id || bug.assignee || "",
        status: bug.status || "OPEN",
      });
    } else {
      setForm(emptyForm);
    }

    setErrors({});
    setError("");
  }, [isOpen, bug]);

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

    if (!SEVERITIES.includes(form.severity)) {
      next.severity = "Select a valid severity.";
    }

    if (form.errorMessage.length > ERROR_MESSAGE_LIMIT) {
      next.errorMessage = `Error message cannot exceed ${ERROR_MESSAGE_LIMIT} characters.`;
    }

    if (form.code.length > CODE_LIMIT) {
      next.code = `Code cannot exceed ${CODE_LIMIT} characters.`;
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
      severity: form.severity,
      language: form.language,
      errorMessage: form.errorMessage,
      code: form.code,
    };

    payload.assignee = form.assignee || null;

    if (isEditing) {
      payload.status = form.status;
    }

    try {
      if (isEditing) {
        await updateBug(bug._id, payload);
      } else {
        await createBug(projectId, payload);
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Bug" : "Report Bug"}
      size="lg"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert>{error}</Alert>

        <div className="space-y-1.5">
          <TextField
            id="title"
            label="Title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. JWT authentication failing"
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
            placeholder="Describe what happens and how to reproduce it..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="severity" className="block text-sm font-medium text-zinc-300">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              value={form.severity}
              onChange={handleChange}
              className={inputClass}
            >
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
            {errors.severity ? (
              <p className="text-xs text-red-400">{errors.severity}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="language" className="block text-sm font-medium text-zinc-300">
              Language
            </label>
            <select
              id="language"
              name="language"
              value={form.language}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select a language</option>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="assignee" className="block text-sm font-medium text-zinc-300">
              Assignee
            </label>
            <select
              id="assignee"
              name="assignee"
              value={form.assignee}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {isEditing ? (
            <div className="space-y-1.5">
              <label htmlFor="status" className="block text-sm font-medium text-zinc-300">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={inputClass}
              >
                {BUG_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="errorMessage" className="block text-sm font-medium text-zinc-300">
            Error Message
          </label>
          <textarea
            id="errorMessage"
            name="errorMessage"
            value={form.errorMessage}
            onChange={handleChange}
            rows={3}
            maxLength={ERROR_MESSAGE_LIMIT}
            placeholder="Type or paste the error message..."
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <div className="flex items-center justify-between">
            {errors.errorMessage ? (
              <p className="text-xs text-red-400">{errors.errorMessage}</p>
            ) : (
              <span />
            )}
            <span className={countClass}>
              {form.errorMessage.length.toLocaleString()} /{" "}
              {ERROR_MESSAGE_LIMIT.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="code" className="block text-sm font-medium text-zinc-300">
            Code
          </label>
          <textarea
            id="code"
            name="code"
            value={form.code}
            onChange={handleChange}
            rows={12}
            maxLength={CODE_LIMIT}
            spellCheck={false}
            placeholder={"function login() {\n  // paste the relevant code\n}"}
            className={`${inputClass} mt-1 min-h-[16rem] resize-y overflow-auto whitespace-pre font-mono text-xs leading-relaxed`}
          />
          <div className="flex items-center justify-between">
            {errors.code ? (
              <p className="text-xs text-red-400">{errors.code}</p>
            ) : (
              <span />
            )}
            <span className={countClass}>
              {form.code.length.toLocaleString()} /{" "}
              {CODE_LIMIT.toLocaleString()}
            </span>
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
                : "Report Bug"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BugForm;
