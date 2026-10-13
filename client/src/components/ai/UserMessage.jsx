const UserMessage = ({ content }) => (
  <div className="flex justify-end">
    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-indigo-900/60 bg-indigo-950/40 px-4 py-3 text-sm leading-relaxed text-zinc-100">
      {content}
    </div>
  </div>
);

export default UserMessage;