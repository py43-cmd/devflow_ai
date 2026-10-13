import { categoryLabel, categoryStyles } from "../../utils/codeReviewMeta";

const CategoryBadge = ({ value }) => {
  if (!value) {
    return null;
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
        categoryStyles[value] || categoryStyles.default
      }`}
    >
      {categoryLabel(value)}
    </span>
  );
};

export default CategoryBadge;
