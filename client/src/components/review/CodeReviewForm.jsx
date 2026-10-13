import Button from "../common/Button";
import { MAX_CODE_LENGTH, REVIEW_LANGUAGES } from "../../utils/codeReviewMeta";

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const CodeReviewForm = ({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  projectId,
  onProjectChange,
  projects,
  projectsLoading,
  onSubmit,
  reviewing,
}) => {
  const length = code.length;
  const overLimit = length > MAX_CODE_LENGTH;
  const nearLimit = !overLimit && length > MAX_CODE_LENGTH * 0.9;
  const canSubmit = !reviewing && code.trim().length > 0 && !overLimit;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          onSubmit();
        }
      }}
      className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="cr-language"
            className="mb-1 block text-xs uppercase tracking-wide text-zinc-500"
          >
            Language
          </label>
          <select
            id="cr-language"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            className={selectClass}
          >
            {REVIEW_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="cr-project"
            className="mb-1 block text-xs uppercase tracking-wide text-zinc-500"
          >
            Project context <span className="text-zinc-600">(optional)</span>
          </label>
          <select
            id="cr-project"
            value={projectId}
            onChange={(event) => onProjectChange(event.target.value)}
            disabled={projectsLoading}
            className={selectClass}
          >
            <option value="">
              {projectsLoading ? "Loading projects..." : "No project context"}
            </option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor="cr-code"
            className="text-xs uppercase tracking-wide text-zinc-500"
          >
            Code
          </label>
          <span
            className={`text-xs ${
              overLimit
                ? "text-red-400"
                : nearLimit
                  ? "text-amber-400"
                  : "text-zinc-500"
            }`}
          >
            {length.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()}
          </span>
        </div>
        <textarea
          id="cr-code"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          rows={16}
          spellCheck={false}
          placeholder="Paste the code you want reviewed..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        {overLimit ? (
          <p className="mt-2 text-xs text-red-400">
            Code exceeds the maximum length of{" "}
            {MAX_CODE_LENGTH.toLocaleString()} characters.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {reviewing ? "Reviewing..." : "Review Code"}
        </Button>
        <p className="text-xs text-zinc-500">
          AI-generated review is advisory. Verify findings before applying changes.
        </p>
      </div>
    </form>
  );
};

export default CodeReviewForm;
