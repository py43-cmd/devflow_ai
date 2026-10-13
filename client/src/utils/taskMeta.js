export const STATUS_ORDER = [
  { value: "TODO", label: "TODO" },
  { value: "IN_PROGRESS", label: "IN PROGRESS" },
  { value: "REVIEW", label: "REVIEW" },
  { value: "DONE", label: "DONE" },
];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const priorityStyles = {
  LOW: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
  MEDIUM: "border-sky-900/60 bg-sky-950/40 text-sky-300",
  HIGH: "border-amber-900/60 bg-amber-950/40 text-amber-300",
  CRITICAL: "border-red-900/60 bg-red-950/40 text-red-300",
};

export const statusStyles = {
  TODO: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
  IN_PROGRESS: "border-indigo-900/60 bg-indigo-950/40 text-indigo-300",
  REVIEW: "border-amber-900/60 bg-amber-950/40 text-amber-300",
  DONE: "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
};

export const statusLabel = (status) => (status || "").replace("_", " ");

export const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
