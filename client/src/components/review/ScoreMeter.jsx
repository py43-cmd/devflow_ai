import { scoreStyles } from "../../utils/codeReviewMeta";

const ScoreMeter = ({ score }) => {
  const value = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const styles = scoreStyles(value);

  return (
    <div className="flex items-center gap-4">
      <p className={`text-4xl font-bold tracking-tight ${styles.text}`}>
        {value}
        <span className="text-lg font-medium text-zinc-500">/100</span>
      </p>
      <div className="h-2 w-full max-w-[12rem] overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${styles.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

export default ScoreMeter;
