import { useState } from "react";

import { createProject } from "../../services/projectService";
import { getErrorMessage } from "../../utils/getErrorMessage";
import Alert from "./Alert";
import Button from "./Button";
import Modal from "./Modal";
import TextField from "./TextField";

const initialForm = {
  name: "",
  description: "",
  technologies: "",
  repositoryUrl: "",
};

const CreateProjectModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }
    setForm(initialForm);
    setError("");
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();

    if (!name) {
      setError("Project name is required.");
      return;
    }

    setSubmitting(true);

    try {
      await createProject({
        name,
        description: form.description.trim(),
        technologies: form.technologies
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean),
        repositoryUrl: form.repositoryUrl.trim(),
      });

      setForm(initialForm);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Project">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert>{error}</Alert>

        <TextField
          id="name"
          label="Project Name"
          value={form.name}
          onChange={handleChange}
          placeholder="DevFlow AI"
        />

        <div className="space-y-1.5">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-300"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            placeholder="AI-powered developer workspace..."
            className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <TextField
          id="technologies"
          label="Technologies"
          value={form.technologies}
          onChange={handleChange}
          placeholder="React, Node.js, MongoDB"
          required={false}
        />
        <p className="text-xs text-zinc-500">
          Separate technologies with commas.
        </p>

        <TextField
          id="repositoryUrl"
          label="Repository URL"
          type="url"
          value={form.repositoryUrl}
          onChange={handleChange}
          placeholder="https://github.com/example/devflow-ai"
          required={false}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateProjectModal;
