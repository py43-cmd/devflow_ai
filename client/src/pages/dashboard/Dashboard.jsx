import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Button from "../../components/common/Button";
import CreateProjectModal from "../../components/common/CreateProjectModal";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import ProjectCard from "../../components/common/ProjectCard";
import StatCard from "../../components/common/StatCard";
import { useAuth } from "../../context/AuthContext";
import { getProjects } from "../../services/projectService";

const Dashboard = () => {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const stats = [
    { label: "Projects", value: projects.length },
    { label: "Tasks", value: "—", to: "/tasks", actionLabel: "View tasks" },
    { label: "Open Bugs", value: "—", to: "/bugs", actionLabel: "View Bug Tracker" },
  ];

  const recentProjects = projects.slice(0, 3);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-zinc-950 to-indigo-950/30 p-6 shadow-[0_40px_120px_-80px_rgba(99,102,241,0.8)] sm:p-8">
        <div className="pointer-events-none absolute -top-24 right-[-60px] h-[280px] w-[280px] rounded-full bg-indigo-500/20 blur-[160px]" />
        <div className="pointer-events-none absolute -bottom-24 left-[-80px] h-[260px] w-[260px] rounded-full bg-violet-500/15 blur-[160px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300/80">
              DevFlow AI
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              {greeting}, {user?.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              AI-powered developer workspace to plan, track, review, document, and debug
              your projects — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>
            <Link
              to="/ai-assistant"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-indigo-500/60 hover:text-indigo-200"
            >
              Ask AI Assistant
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-5 transition hover:border-indigo-500/60"
          >
            <div className="pointer-events-none absolute -top-10 right-[-40px] h-[180px] w-[180px] rounded-full bg-indigo-500/10 blur-[120px]" />
            <StatCard
              label={stat.label}
              value={stat.value}
              to={stat.to}
              actionLabel={stat.actionLabel}
            />
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Recent Projects
          </h3>
          {projects.length > 0 ? (
            <Link
              to="/projects"
              className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              View all
            </Link>
          ) : null}
        </div>

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
            description="Create your first project to start managing your development workflow with AI."
            actionLabel="Create Project"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
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

export default Dashboard;