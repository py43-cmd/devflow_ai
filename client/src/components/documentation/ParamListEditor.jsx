import { emptyParam } from "../../utils/documentationMeta";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const ParamListEditor = ({ label, params, onChange, max = 50 }) => {
  const update = (index, key, value) => {
    const next = params.map((param, i) =>
      i === index ? { ...param, [key]: value } : param,
    );
    onChange(next);
  };

  const add = () => {
    if (params.length >= max) {
      return;
    }
    onChange([...params, emptyParam()]);
  };

  const remove = (index) => {
    onChange(params.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <button
          type="button"
          onClick={add}
          disabled={params.length >= max}
          className="rounded-md border border-zinc-800 px-2 py-0.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      {params.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-3 text-xs text-zinc-600">
          None
        </p>
      ) : (
        <div className="space-y-2">
          {params.map((param, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_0.8fr_auto_1.6fr_auto]"
            >
              <input
                type="text"
                value={param.name}
                onChange={(event) => update(index, "name", event.target.value)}
                placeholder="name"
                className={inputClass}
              />
              <input
                type="text"
                value={param.type}
                onChange={(event) => update(index, "type", event.target.value)}
                placeholder="type"
                className={inputClass}
              />
              <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={Boolean(param.required)}
                  onChange={(event) =>
                    update(index, "required", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-indigo-500"
                />
                Req
              </label>
              <input
                type="text"
                value={param.description}
                onChange={(event) =>
                  update(index, "description", event.target.value)
                }
                placeholder="description"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove ${label} item`}
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

export default ParamListEditor;
