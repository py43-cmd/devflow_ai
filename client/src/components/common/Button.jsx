const variants = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500/40",
  secondary:
    "border border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 focus-visible:ring-zinc-600/40",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/40",
  ghost:
    "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 focus-visible:ring-zinc-700/40",
};

const Button = ({
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
  children,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
