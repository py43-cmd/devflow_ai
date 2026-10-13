export { formatDateTime } from "./taskMeta";

export const MAX_CODE_LENGTH = 20000;

export const REVIEW_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
];

export const REVIEW_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const REVIEW_CATEGORIES = [
  "BUG",
  "SECURITY",
  "PERFORMANCE",
  "CODE_QUALITY",
  "MAINTAINABILITY",
  "BEST_PRACTICE",
];

export const categoryStyles = {
  BUG: "border-red-900/60 bg-red-950/40 text-red-300",
  SECURITY: "border-orange-900/60 bg-orange-950/40 text-orange-300",
  PERFORMANCE: "border-amber-900/60 bg-amber-950/40 text-amber-300",
  CODE_QUALITY: "border-sky-900/60 bg-sky-950/40 text-sky-300",
  MAINTAINABILITY: "border-violet-900/60 bg-violet-950/40 text-violet-300",
  BEST_PRACTICE: "border-indigo-900/60 bg-indigo-950/40 text-indigo-300",
  default: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
};

export const categoryLabel = (category) =>
  (category || "").replace(/_/g, " ");

export const scoreStyles = (score) => {
  const value = Number.isFinite(score) ? score : 0;

  if (value >= 80) {
    return { text: "text-emerald-400", bar: "bg-emerald-500" };
  }
  if (value >= 60) {
    return { text: "text-amber-400", bar: "bg-amber-500" };
  }
  if (value >= 40) {
    return { text: "text-orange-400", bar: "bg-orange-500" };
  }
  return { text: "text-red-400", bar: "bg-red-500" };
};
