import Button from "./Button";

const EmptyState = ({ title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-zinc-400">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  );
};

export default EmptyState;
