import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/common/Button";
import TaskGeneratorForm from "../../components/taskgen/TaskGeneratorForm";
import GeneratedTasks from "../../components/taskgen/GeneratedTasks";
import { getProjects } from "../../services/projectService";
import { createTask } from "../../services/taskService";
import { generateTasks } from "../../services/taskGeneratorService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PROGRESS_MESSAGES = [
  "Understanding the goal",
  "Reviewing project context",
  "Breaking down the work",
  "Scoping individual tasks",
  "Estimating effort and priority",
  "Finalizing the task list",
];

const PROGRESS_INTERVAL_MS = 2200;

const buildDescription = (task) => {
  const parts = [];

  if (task.description) {
    parts.push(task.description);
  }

  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    parts.push(
      ["Subtasks:", ...task.subtasks.map((subtask) => `- ${subtask}`)].join("\n"),
    );
  }

  return parts.join("\n\n").slice(0, 2000);
};

const TaskGenerator = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(null);
  const [generatedProjectId, setGeneratedProjectId] = useState("");
  const [selected, setSelected] = useState([]);
  const [progressIndex, setProgressIndex] = useState(0);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createResult, setCreateResult] = useState(null);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);

    try {
      const data = await getProjects();
      setProjects(data.data.projects);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!generating) {
      return undefined;
    }

    const timer = setInterval(() => {
      setProgressIndex((index) => (index + 1) % PROGRESS_MESSAGES.length);
    }, PROGRESS_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [generating]);

  const handleGenerate = async ({ projectId, goal, constraints, context, maxTasks }) => {
    setError("");
    setGenerated(null);
    setSelected([]);
    setCreateError("");
    setCreateResult(null);
    setProgressIndex(0);
    setGenerating(true);

    try {
      const data = await generateTasks({
        projectId,
        goal,
        constraints,
        context,
        maxTasks,
      });

      const tasks = data.data.tasks || [];
      setGenerated(data.data);
      setGeneratedProjectId(projectId);
      setSelected(tasks.map(() => true));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = (index) => {
    setSelected((previous) =>
      previous.map((value, i) => (i === index ? !value : value)),
    );
  };

  const handleToggleAll = () => {
    if (!generated) {
      return;
    }

    const allSelected = selected.every(Boolean) && selected.length > 0;
    setSelected(generated.tasks.map(() => !allSelected));
  };

  const handleCreateSelected = async () => {
    if (!generated || !generatedProjectId) {
      return;
    }

    setCreateError("");
    setCreateResult(null);
    setCreating(true);

    const chosen = generated.tasks.filter((_, index) => selected[index]);
    let created = 0;
    let failed = 0;

    for (const task of chosen) {
      try {
        await createTask(generatedProjectId, {
          title: task.title,
          description: buildDescription(task),
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          tags: task.tags,
        });
        created += 1;
      } catch {
        failed += 1;
      }
    }

    setCreating(false);
    setCreateResult({ created, failed });

    if (created > 0) {
      setGenerated((previous) => {
        if (!previous) {
          return previous;
        }

        const remaining = previous.tasks.filter((_, index) => !selected[index]);
        setSelected(remaining.map(() => true));
        return { ...previous, tasks: remaining };
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
          AI Task Generator
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Describe a goal and generate a structured, reviewable set of tasks for
          your project.
        </p>
      </div>

      <TaskGeneratorForm
        projects={projects}
        projectsLoading={projectsLoading}
        onSubmit={handleGenerate}
        generating={generating}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      {generating ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="flex items-center gap-2 text-sm text-zinc-200">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
            Generating tasks...
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {PROGRESS_MESSAGES[progressIndex]}
          </p>
        </div>
      ) : generated ? (
        <div className="space-y-4">
          {createError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {createError}
            </div>
          ) : null}

          {createResult ? (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300"
            >
              <span>
                Created {createResult.created} task
                {createResult.created === 1 ? "" : "s"}
                {createResult.failed > 0
                  ? `, ${createResult.failed} failed`
                  : ""}
                .
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  navigate(`/tasks?project=${generatedProjectId}`)
                }
              >
                View Tasks
              </Button>
            </div>
          ) : null}

          <GeneratedTasks
            generated={generated}
            selected={selected}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            onCreateSelected={handleCreateSelected}
            creating={creating}
          />
        </div>
      ) : null}
    </div>
  );
};

export default TaskGenerator;
