import { Link } from "react-router-dom";

const statusStyles = {
  ACTIVE: "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
  COMPLETED: "border-indigo-900/60 bg-indigo-950/40 text-indigo-300",
  ARCHIVED: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
};

const ProjectCard = ({ project }) => {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-50">
          {project.name}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
            statusStyles[project.status] || statusStyles.ARCHIVED
          }`}
        >
          {project.status}
        </span>
      </div>

      {project.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
          {project.description}
        </p>
      ) : (
        <p className="mt-2 text-sm text-zinc-600">No description</p>
      )}

      {project.technologies?.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.technologies.slice(0, 6).map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-400"
            >
              {tech}
            </span>
          ))}
          {project.technologies.length > 6 ? (
            <span className="text-xs text-zinc-500">
              +{project.technologies.length - 6}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        <Link
          to={`/projects/${project._id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          Open Project <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
};

export default ProjectCard;
