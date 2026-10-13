import { useMemo, useState } from "react";

import Button from "../common/Button";
import { LIMITS } from "../../utils/taskGeneratorMeta";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const labelClass = "mb-1 block text-xs uppercase tracking-wide text-zinc-500";

const TaskGeneratorForm = ({ projects, projectsLoading, onSubmit, generating }) => {
  const [projectId, setProjectId] = useState("");
  const [goal, setGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [context, setContext] = useState("");
  const [maxTasks, setMaxTasks] = useState(String(LIMITS.defaultMaxTasks));

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const numericMax = Number(maxTasks);
  const maxTasksValid =
    maxTasks !== "" &&
    Number.isFinite(numericMax) &&
    numericMax >= 1 &&
    numericMax <= LIMITS.maxTasks;

  const canSubmit = useMemo(
    () => !generating && Boolean(projectId) && goal.trim().length > 0 && maxTasksValid,
    [generating, projectId, goal, maxTasksValid],
  );

  const reset = () => {
    setGoal("");
    setConstraints("");
    setContext("");
    setMaxTasks(String(LIMITS.defaultMaxTasks));
    setFormError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    if (!projectId) {
      setFormError("Select a project.");
      return;
    }

    if (!goal.trim()) {
      setFormError("Describe the goal you want broken into tasks.");
      return;
    }

    if (goal.trim().length > LIMITS.goal) {
      setFormError(`Goal exceeds the maximum of ${LIMITS.goal} characters.`);
      return;
    }

    if (!maxTasksValid) {
      setFormError(`Max tasks must be a number between 1 and ${LIMITS.maxTasks}.`);
      return;
    }

    onSubmit({
      projectId,
      goal: goal.trim(),
      constraints: constraints.trim(),
      context: context.trim(),
      maxTasks: Math.floor(numericMax),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
    >
      <div>
        <label htmlFor="tg-project" className={labelClass}>
          Project
        </label>
        <select
          id="tg-project"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          disabled={projectsLoading}
          className={inputClass}
        >
          <option value="">
            {projectsLoading ? "Loading projects..." : "Select a project"}
          </option>
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tg-goal" className={labelClass}>
          Goal
        </label>
        <textarea
          id="tg-goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={4}
          placeholder="e.g. Add JWT authentication with registration, login, and protected routes"
          className={inputClass}
        />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-wide text-zinc-400 transition hover:text-zinc-200"
        >
          Advanced options
          <span className="text-zinc-600">{advancedOpen ? "▲" : "▼"}</span>
        </button>

        {advancedOpen ? (
          <div className="space-y-4 border-t border-zinc-800 p-4">
            <div>
              <label htmlFor="tg-constraints" className={labelClass}>
                Constraints
              </label>
              <textarea
                id="tg-constraints"
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                rows={3}
                placeholder="e.g. Must use the existing Express + Mongoose stack"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="tg-context" className={labelClass}>
                Additional context
              </label>
              <textarea
                id="tg-context"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                rows={3}
                placeholder="Anything else the team should know"
                className={inputClass}
              />
            </div>

            <div className="sm:max-w-[200px]">
              <label htmlFor="tg-max" className={labelClass}>
                Max tasks
              </label>
              <input
                id="tg-max"
                type="number"
                min="1"
                max={LIMITS.maxTasks}
                value={maxTasks}
                onChange={(event) => setMaxTasks(event.target.value)}
                className={inputClass}
              />
              {!maxTasksValid ? (
                <p className="mt-1 text-xs text-red-400">
                  Enter a number between 1 and {LIMITS.maxTasks}.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-xs text-red-400">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {generating ? "Generating..." : "Generate Tasks"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={reset}
          disabled={generating}
        >
          Reset
        </Button>
        <p className="text-xs text-zinc-500">
          AI-generated tasks are suggestions. Review and edit before creating.
        </p>
      </div>
    </form>
  );
};

export default TaskGeneratorForm;
