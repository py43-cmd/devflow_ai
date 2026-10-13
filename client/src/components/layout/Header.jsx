import { useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const getTitle = (pathname) => {
  if (pathname.startsWith("/projects/")) {
    return "Project Details";
  }
  if (pathname.startsWith("/projects")) {
    return "Projects";
  }
  if (pathname.startsWith("/tasks/")) {
    return "Task Details";
  }
  if (pathname.startsWith("/tasks")) {
    return "Tasks";
  }
  if (pathname.startsWith("/bugs/")) {
    return "Bug Details";
  }
  if (pathname.startsWith("/bugs")) {
    return "Bugs";
  }
  if (pathname.startsWith("/code-review")) {
    return "AI Code Review";
  }
  if (pathname.startsWith("/documentation")) {
    return "AI Documentation";
  }
  if (pathname.startsWith("/task-generator")) {
    return "AI Task Generator";
  }
  if (pathname.startsWith("/ai-assistant")) {
    return "AI Assistant";
  }
  if (pathname.startsWith("/dashboard")) {
    return "Dashboard";
  }
  return "DevFlow AI";
};

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const initial = user?.name?.charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 lg:hidden"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            {getTitle(pathname)}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-400 sm:inline">
            {user?.name}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200">
            {initial}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
