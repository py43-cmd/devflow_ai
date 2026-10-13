import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import TaskBoard from "../../components/task/TaskBoard";
import TaskFilters from "../../components/task/TaskFilters";
import TaskForm from "../../components/task/TaskForm";
import { getProject, getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 sm:w-64";

const Tasks = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFromUrl = searchParams.get("project") || "";

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState(projectFromUrl);
  const [members, setMembers] = useState([]);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee: "",
  });
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError("");

    try {
      const data = await getProjects();
      setProjects(data.data.projects);
    } catch {
      setProjectsError("Unable to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projectsLoading || selectedProjectId) {
      return;
    }

    if (
      projectFromUrl &&
      projects.some((project) => project._id === projectFromUrl)
    ) {
      setSelectedProjectId(projectFromUrl);
      return;
    }

    if (projects.length > 0) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, projectsLoading, projectFromUrl, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId && projectFromUrl !== selectedProjectId) {
      setSearchParams({ project: selectedProjectId }, { replace: true });
    }
  }, [selectedProjectId, projectFromUrl, setSearchParams]);

  const loadTasks = useCallback(async () => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    setTasksLoading(true);
    setTasksError("");

    const params = {};
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.priority) {
      params.priority = filters.priority;
    }
    if (filters.assignee) {
      params.assignee = filters.assignee;
    }

    try {
      const data = await getTasks(selectedProjectId, params);
      setTasks(data.data.tasks);
    } catch {
      setTasksError("Unable to load tasks.");
    } finally {
      setTasksLoading(false);
    }
  }, [selectedProjectId, filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedProjectId) {
        setMembers([]);
        return;
      }

      try {
        const data = await getProject(selectedProjectId);
        setMembers(
          (data.data.project.members || [])
            .map((member) => member.user)
            .filter(Boolean),
        );
      } catch {
        setMembers([]);
      }
    };

    loadMembers();
  }, [selectedProjectId]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return tasks;
    }

    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query) ||
        (task.tags || []).some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [tasks, search]);

  const handleFilterChange = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: "", priority: "", assignee: "" });
  };

  const openCreate = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const openTask = (task) => {
    navigate(`/tasks/${task._id}`);
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.assignee,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
            Tasks
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Track and manage work across your project board.
          </p>
        </div>
        {projects.length > 0 && selectedProjectId ? (
          <Button onClick={openCreate}>+ New Task</Button>
        ) : null}
      </div>

      {projectsLoading ? (
        <Loading label="Loading projects..." />
      ) : projectsError ? (
        <EmptyState
          title={projectsError}
          description="Please try again."
          actionLabel="Retry"
          onAction={loadProjects}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project before you can manage tasks."
          actionLabel="Go to Projects"
          onAction={() => navigate("/projects")}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              aria-label="Select project"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className={selectClass}
            >
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 sm:max-w-xs"
            />
          </div>

          <TaskFilters
            filters={filters}
            onChange={handleFilterChange}
            members={members}
            onClear={clearFilters}
          />

          <section>
            {tasksLoading ? (
              <Loading label="Loading tasks..." />
            ) : tasksError ? (
              <EmptyState
                title={tasksError}
                description="Please try again."
                actionLabel="Retry"
                onAction={loadTasks}
              />
            ) : tasks.length === 0 ? (
              <EmptyState
                title={
                  hasActiveFilters ? "No matching tasks" : "No tasks yet"
                }
                description={
                  hasActiveFilters
                    ? "Try adjusting or clearing your filters."
                    : "Create your first task to start tracking work on this project."
                }
                actionLabel={
                  hasActiveFilters ? "Clear Filters" : "Create Task"
                }
                onAction={hasActiveFilters ? clearFilters : openCreate}
              />
            ) : visibleTasks.length === 0 ? (
              <EmptyState
                title="No matching tasks"
                description="Try a different search term."
              />
            ) : (
              <TaskBoard
                tasks={visibleTasks}
                onTaskClick={openTask}
                onCreateTask={openCreate}
              />
            )}
          </section>
        </>
      )}

      <TaskForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={selectedProjectId}
        task={editingTask}
        onSaved={loadTasks}
      />
    </div>
  );
};

export default Tasks;
