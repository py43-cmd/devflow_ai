import { methodStyles } from "../../utils/documentationMeta";

const MethodBadge = ({ method }) => {
  const styles = methodStyles[method] || methodStyles.default;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide ${styles}`}
    >
      {(method || "").toUpperCase()}
    </span>
  );
};

export default MethodBadge;
