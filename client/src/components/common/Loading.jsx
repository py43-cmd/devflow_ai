const Loading = ({ label = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
};

export default Loading;
