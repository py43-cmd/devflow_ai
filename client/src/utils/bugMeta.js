export { formatDate, formatDateTime } from "./taskMeta";

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const BUG_STATUSES = [
  { value: "OPEN", label: "OPEN" },
  { value: "IN_PROGRESS", label: "IN PROGRESS" },
  { value: "RESOLVED", label: "RESOLVED" },
  { value: "CLOSED", label: "CLOSED" },
];

export const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Kotlin",
  "Swift",
  "SQL",
  "Shell",
  "HTML",
  "CSS",
  "Other",
];

export const ERROR_MESSAGE_LIMIT = 5000;
export const CODE_LIMIT = 20000;

export const severityStyles = {
  LOW: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
  MEDIUM: "border-sky-900/60 bg-sky-950/40 text-sky-300",
  HIGH: "border-amber-900/60 bg-amber-950/40 text-amber-300",
  CRITICAL: "border-red-900/60 bg-red-950/40 text-red-300",
};

export const bugStatusStyles = {
  OPEN: "border-indigo-900/60 bg-indigo-950/40 text-indigo-300",
  IN_PROGRESS: "border-amber-900/60 bg-amber-950/40 text-amber-300",
  RESOLVED: "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
  CLOSED: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
};

export const bugStatusLabel = (status) => (status || "").replace("_", " ");
