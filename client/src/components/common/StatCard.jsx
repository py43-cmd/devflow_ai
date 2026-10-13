import { Link } from "react-router-dom";

const StatCard = ({ label, value, hint, to, actionLabel }) => {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      {to ? (
        <Link
          to={to}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          {actionLabel} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
};

export default StatCard;
