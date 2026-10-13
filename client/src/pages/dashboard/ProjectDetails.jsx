import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import BugForm from "../../components/bug/BugForm";
import TaskForm from "../../components/task/TaskForm";
import ProjectDocumentsSection from "../../components/knowledge/ProjectDocumentsSection";
import { getProject } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getBugs } from "../../services/bugService";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { STATUS_ORDER } from "../../utils/taskMeta";

const statusStyles = {
  ACTIVE: "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
  COMPLETED: "border-indigo-900/60 bg-indigo-950/40 text-indigo-300",
  ARCHIVED: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
};

const ProjectDetails = () => {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const [bugs, setBugs] = useState([]);
  const [bugsLoading, setBugsLoading] = useState(true);
  const [bugsError, setBugsError] = useState("");
  const [bugFormOpen, setBugFormOpen] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getProject(id);
      setProject(data.data.project);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError("");

    try {
      const data = await getTasks(id);
      setTasks(data.data.tasks);
    } catch {
      setTasksError("Unable to load tasks.");
    } finally {
      setTasksLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const loadBugs = useCallback(async () => {
    setBugsLoading(true);
    setBugsError("");

    try {
      const data = await getBugs(id);
      setBugs(data.data.bugs);
    } catch {
      setBugsError("Unable to load bugs.");
    } finally {
      setBugsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

  if (loading) {
    return <Loading label="Loading project..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          to="/projects"
          className="text-sm text-zinc-400 transition hover:text-zinc-100"
        >
          ← Back to projects
        </Link>
        <EmptyState
          title="Unable to load project"
          description={error}
          actionLabel="Retry"
          onAction={loadProject}
        />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const owner = project.owner;
  const members = project.members || [];

  const taskCounts = STATUS_ORDER.reduce((counts, status) => {
    counts[status.value] = tasks.filter(
      (task) => task.status === status.value,
    ).length;
    return counts;
  }, {});

  const openBugCount = bugs.filter((bug) => bug.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="text-sm text-zinc-400 transition hover:text-zinc-100"
      >
        ← Back to projects
      </Link>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {project.name}
            </h2>
            {project.description ? (
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                {project.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">No description</p>
            )}
          </div>
          <span
            className={`shrink-0 self-start rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${
              statusStyles[project.status] || statusStyles.ARCHIVED
            }`}
          >
            {project.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Technologies
          </h3>
          {project.technologies?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-400"
                >
                  {tech}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">
              No technologies listed
            </p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Repository
          </h3>
          {project.repositoryUrl ? (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              Open Repository <span aria-hidden="true">→</span>
            </a>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">No repository linked</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Tasks
            </h3>
            {!tasksLoading && !tasksError ? (
              <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                {tasks.length} total
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/tasks?project=${project._id}`}
              className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              View Task Board <span aria-hidden="true">→</span>
            </Link>
            <Button variant="secondary" onClick={() => setTaskFormOpen(true)}>
              + New Task
            </Button>
          </div>
        </div>

        {tasksLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading tasks...</p>
        ) : tasksError ? (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm text-zinc-500">{tasksError}</p>
            <button
              type="button"
              onClick={loadTasks}
              className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_ORDER.map((status) => (
              <div
                key={status.value}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {status.label}
                </p>
                <p className="mt-1 text-xl font-semibold text-zinc-100">
                  {taskCounts[status.value]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Bug Tracking
            </h3>
            {!bugsLoading && !bugsError ? (
              <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                {bugs.length} total
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/bugs?project=${project._id}`}
              className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              View Bugs <span aria-hidden="true">→</span>
            </Link>
            <Button variant="secondary" onClick={() => setBugFormOpen(true)}>
              + Report Bug
            </Button>
          </div>
        </div>

        {bugsLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading bugs...</p>
        ) : bugsError ? (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm text-zinc-500">{bugsError}</p>
            <button
              type="button"
              onClick={loadBugs}
              className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-2xl font-semibold tracking-tight text-zinc-50">
              {openBugCount}
              <span className="ml-2 text-sm font-normal text-zinc-400">
                open bug{openBugCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        )}
      </div>

      <ProjectDocumentsSection projectId={project._id} />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Team
        </h3>
        <ul className="mt-3 space-y-3">
          {members.map((member) => (
            <li
              key={member.user?._id || member._id}
              className="flex items-center gap-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200">
                {member.user?.name?.charAt(0).toUpperCase() || "?"}
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {member.user?.name || "Unknown user"}
                </p>
                <p className="text-xs text-zinc-500">{member.role}</p>
              </div>
            </li>
          ))}
        </ul>

        {owner ? (
          <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
            Owner: {owner.name}
            {owner.email ? ` · ${owner.email}` : ""}
          </p>
        ) : null}
      </div>

      <TaskForm
        isOpen={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        projectId={project._id}
        onSaved={loadTasks}
      />

      <BugForm
        isOpen={bugFormOpen}
        onClose={() => setBugFormOpen(false)}
        projectId={project._id}
        onSaved={loadBugs}
      />
    </div>
  );
};

export default ProjectDetails;
