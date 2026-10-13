import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import BugCard from "../../components/bug/BugCard";
import BugFilters from "../../components/bug/BugFilters";
import BugForm from "../../components/bug/BugForm";
import { getProject, getProjects } from "../../services/projectService";
import { getBugs } from "../../services/bugService";

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 sm:w-64";

const BugStat = ({ label, value }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
    <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
      {value}
    </p>
  </div>
);

const Bugs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFromUrl = searchParams.get("project") || "";

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState(projectFromUrl);
  const [members, setMembers] = useState([]);

  const [bugs, setBugs] = useState([]);
  const [bugsLoading, setBugsLoading] = useState(false);
  const [bugsError, setBugsError] = useState("");

  const [filters, setFilters] = useState({
    severity: "",
    status: "",
    assignee: "",
  });
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingBug, setEditingBug] = useState(null);

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

  const loadBugs = useCallback(async () => {
    if (!selectedProjectId) {
      setBugs([]);
      return;
    }

    setBugsLoading(true);
    setBugsError("");

    const params = {};
    if (filters.severity) {
      params.severity = filters.severity;
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.assignee) {
      params.assignee = filters.assignee;
    }

    try {
      const data = await getBugs(selectedProjectId, params);
      setBugs(data.data.bugs);
    } catch {
      setBugsError("Unable to load bugs.");
    } finally {
      setBugsLoading(false);
    }
  }, [selectedProjectId, filters]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

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

  const visibleBugs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return bugs;
    }

    return bugs.filter(
      (bug) =>
        bug.title.toLowerCase().includes(query) ||
        (bug.description || "").toLowerCase().includes(query) ||
        (bug.errorMessage || "").toLowerCase().includes(query) ||
        (bug.language || "").toLowerCase().includes(query),
    );
  }, [bugs, search]);

  const stats = useMemo(
    () => ({
      total: bugs.length,
      open: bugs.filter((bug) => bug.status === "OPEN").length,
      inProgress: bugs.filter((bug) => bug.status === "IN_PROGRESS").length,
      resolved: bugs.filter((bug) => bug.status === "RESOLVED").length,
      critical: bugs.filter((bug) => bug.severity === "CRITICAL").length,
    }),
    [bugs],
  );

  const handleFilterChange = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ severity: "", status: "", assignee: "" });
  };

  const openCreate = () => {
    setEditingBug(null);
    setFormOpen(true);
  };

  const openBug = (bug) => {
    navigate(`/bugs/${bug._id}`);
  };

  const hasActiveFilters = Boolean(
    filters.severity || filters.status || filters.assignee,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
            Bugs
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Track, investigate, and resolve project issues.
          </p>
        </div>
        {projects.length > 0 && selectedProjectId ? (
          <Button onClick={openCreate}>+ Report Bug</Button>
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
          description="Create a project first to report bugs."
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
              placeholder="Search bugs..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 sm:max-w-xs"
            />
          </div>

          <BugFilters
            filters={filters}
            onChange={handleFilterChange}
            members={members}
            onClear={clearFilters}
          />

          {!bugsLoading && !bugsError && bugs.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <BugStat label="Total Bugs" value={stats.total} />
              <BugStat label="Open" value={stats.open} />
              <BugStat label="In Progress" value={stats.inProgress} />
              <BugStat label="Resolved" value={stats.resolved} />
              <BugStat label="Critical" value={stats.critical} />
            </div>
          ) : null}

          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              All Bugs
            </h3>

            {bugsLoading ? (
              <Loading label="Loading bugs..." />
            ) : bugsError ? (
              <EmptyState
                title={bugsError}
                description="Please try again."
                actionLabel="Retry"
                onAction={loadBugs}
              />
            ) : bugs.length === 0 ? (
              <EmptyState
                title={
                  hasActiveFilters ? "No matching bugs" : "No bugs reported"
                }
                description={
                  hasActiveFilters
                    ? "Try adjusting or clearing your filters."
                    : "Great! No issues have been reported for this project yet."
                }
                actionLabel={
                  hasActiveFilters ? "Clear Filters" : "Report Bug"
                }
                onAction={hasActiveFilters ? clearFilters : openCreate}
              />
            ) : visibleBugs.length === 0 ? (
              <EmptyState
                title="No matching bugs"
                description="Try a different search term."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleBugs.map((bug) => (
                  <BugCard key={bug._id} bug={bug} onClick={() => openBug(bug)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <BugForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={selectedProjectId}
        bug={editingBug}
        onSaved={loadBugs}
      />
    </div>
  );
};

export default Bugs;
