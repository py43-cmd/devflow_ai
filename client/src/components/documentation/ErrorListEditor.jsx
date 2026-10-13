import { emptyError } from "../../utils/documentationMeta";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const ErrorListEditor = ({ errors, onChange, max = 20 }) => {
  const update = (index, key, value) => {
    const next = errors.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange(next);
  };

  const add = () => {
    if (errors.length >= max) {
      return;
    }
    onChange([...errors, emptyError()]);
  };

  const remove = (index) => {
    onChange(errors.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          Error Examples
        </span>
        <button
          type="button"
          onClick={add}
          disabled={errors.length >= max}
          className="rounded-md border border-zinc-800 px-2 py-0.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      {errors.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-3 text-xs text-zinc-600">
          None
        </p>
      ) : (
        <div className="space-y-2">
          {errors.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr_auto]"
            >
              <input
                type="number"
                value={item.status}
                onChange={(event) => update(index, "status", event.target.value)}
                placeholder="status"
                className={inputClass}
              />
              <input
                type="text"
                value={item.message}
                onChange={(event) =>
                  update(index, "message", event.target.value)
                }
                placeholder="error message"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Remove error example"
                className="rounded-lg border border-zinc-800 px-3 text-sm text-zinc-500 transition hover:border-red-900/60 hover:text-red-400"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrorListEditor;
