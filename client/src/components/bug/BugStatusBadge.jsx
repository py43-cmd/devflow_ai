import { bugStatusLabel, bugStatusStyles, severityStyles } from "../../utils/bugMeta";

const BugStatusBadge = ({ type = "status", value }) => {
  if (!value) {
    return null;
  }

  const isSeverity = type === "severity";
  const styleMap = isSeverity ? severityStyles : bugStatusStyles;
  const label = isSeverity ? value : bugStatusLabel(value);
  const fallback = isSeverity ? severityStyles.MEDIUM : bugStatusStyles.OPEN;

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
        styleMap[value] || fallback
      }`}
    >
      {label}
    </span>
  );
};

export default BugStatusBadge;
