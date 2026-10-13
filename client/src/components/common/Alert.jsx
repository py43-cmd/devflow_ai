const Alert = ({ children }) => {
  if (!children) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
    >
      {children}
    </div>
  );
};

export default Alert;
