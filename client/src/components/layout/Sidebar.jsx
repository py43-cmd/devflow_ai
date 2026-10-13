import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const icons = {
  dashboard: (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  projects: (
    <svg {...iconProps}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  tasks: (
    <svg {...iconProps}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  bugs: (
    <svg {...iconProps}>
      <path d="M8 9a4 4 0 0 1 8 0" />
      <rect x="8" y="9" width="8" height="10" rx="4" />
      <path d="M4 13h3M17 13h3M5 19l2.5-2M19 19l-2.5-2M5 7l2.5 2M19 7l-2.5 2" />
    </svg>
  ),
  ai: (
    <svg {...iconProps}>
      <path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  ),
  codeReview: (
    <svg {...iconProps}>
      <path d="M8 6l-5 6 5 6" />
      <path d="M16 6l5 6-5 6" />
      <path d="M13.5 4l-3 16" />
    </svg>
  ),
  documentation: (
    <svg {...iconProps}>
      <path d="M5 4a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  ),
  taskGenerator: (
    <svg {...iconProps}>
      <path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9z" />
      <path d="M6 18h5M6 21h8" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z" />
    </svg>
  ),
};

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: icons.dashboard },
  { label: "Projects", to: "/projects", icon: icons.projects },
  { label: "Tasks", to: "/tasks", icon: icons.tasks },
  { label: "Bugs", to: "/bugs", icon: icons.bugs },
  { label: "Code Review", to: "/code-review", icon: icons.codeReview },
  { label: "Documentation", to: "/documentation", icon: icons.documentation },
  { label: "Task Generator", to: "/task-generator", icon: icons.taskGenerator },
  { label: "AI Assistant", to: "/ai-assistant", icon: icons.ai },
  { label: "Settings", icon: icons.settings, disabled: true },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-zinc-900">
            DF
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-zinc-100">
              DEVFLOW
            </p>
            <p className="text-xs font-medium tracking-[0.2em] text-indigo-400">
              AI
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) =>
            item.disabled ? (
              <div
                key={item.label}
                className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600"
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </span>
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] tracking-wide text-zinc-600">
                  SOON
                </span>
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-zinc-900 text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-semibold text-zinc-200">
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">
                {user?.name}
              </p>
              <p className="truncate text-xs text-zinc-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
