import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "../../components/common/Button";
import CreateProjectModal from "../../components/common/CreateProjectModal";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import ProjectCard from "../../components/common/ProjectCard";
import { getProjects } from "../../services/projectService";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getProjects();
      setProjects(data.data.projects);
    } catch {
      setError("Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.description || "").toLowerCase().includes(query)
    );
  }, [projects, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
            Projects
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your development projects.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>
      </div>

      {projects.length > 0 ? (
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects..."
          className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
      ) : null}

      <section>
        {loading ? (
          <Loading label="Loading projects..." />
        ) : error ? (
          <EmptyState
            title={error}
            description="Please try again."
            actionLabel="Retry"
            onAction={loadProjects}
          />
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to start managing your development workflow."
            actionLabel="Create Project"
            onAction={() => setIsModalOpen(true)}
          />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No matching projects"
            description="Try a different search term."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </section>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadProjects}
      />
    </div>
  );
};

export default Projects;
