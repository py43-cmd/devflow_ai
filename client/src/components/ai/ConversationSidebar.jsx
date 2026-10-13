import { useMemo, useState } from "react";

const getGroupKey = (dateString) => {
  if (!dateString) return "Older";
  const date = new Date(dateString);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfSevenDays = new Date(startOfToday);
  startOfSevenDays.setDate(startOfSevenDays.getDate() - 7);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfSevenDays) return "Previous 7 Days";
  return "Older";
};

const GROUP_ORDER = ["Today", "Yesterday", "Previous 7 Days", "Older"];

export const ConversationSidebar = ({
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  loading = false,
  error = "",
  isOpen = false,
  onClose,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const grouped = useMemo(() => {
    const map = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    };

    conversations.forEach((conv) => {
      const group = getGroupKey(conv.lastMessageAt || conv.updatedAt || conv.createdAt);
      map[group].push(conv);
    });

    return map;
  }, [conversations]);

  const handleStartRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditTitle(conv.title || "New Conversation");
  };

  const handleSaveRename = async (convId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    await onRenameConversation(convId, editTitle.trim());
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  const handleConfirmDelete = async (convId, e) => {
    e.stopPropagation();
    await onDeleteConversation(convId);
    setDeletingId(null);
  };

  const content = (
    <div className="flex h-full w-full flex-col bg-zinc-950 text-zinc-200">
      {/* Top Header & New Chat button */}
      <div className="border-b border-zinc-800 p-3">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Conversations
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onNewConversation();
            if (onClose) onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/30 hover:text-indigo-200 active:scale-[0.99]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="m-3 rounded border border-red-900/60 bg-red-950/40 p-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* List / Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-zinc-900" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <svg
              className="mx-auto h-8 w-8 text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="mt-2 text-xs text-zinc-400">No chat history yet</p>
            <p className="text-[11px] text-zinc-500">Click &ldquo;New Conversation&rdquo; above</p>
          </div>
        ) : (
          GROUP_ORDER.map((group) => {
            const list = grouped[group];
            if (!list || list.length === 0) return null;

            return (
              <div key={group} className="mb-4">
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {group}
                </div>
                <div className="mt-1 space-y-0.5">
                  {list.map((conv) => {
                    const isActive = conv._id === activeConversationId;
                    const isEditing = editingId === conv._id;
                    const isDeleting = deletingId === conv._id;

                    if (isEditing) {
                      return (
                        <form
                          key={conv._id}
                          onSubmit={(e) => handleSaveRename(conv._id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded-lg border border-indigo-500/60 bg-zinc-900 p-1"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            maxLength={100}
                            className="flex-1 bg-transparent px-1.5 py-0.5 text-xs text-zinc-200 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") handleCancelRename(e);
                            }}
                          />
                          <button
                            type="submit"
                            title="Save"
                            className="rounded p-1 text-emerald-400 hover:bg-zinc-800"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            title="Cancel"
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-800"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </form>
                      );
                    }

                    if (isDeleting) {
                      return (
                        <div
                          key={conv._id}
                          className="flex items-center justify-between rounded-lg border border-red-900/60 bg-red-950/40 p-2 text-xs"
                        >
                          <span className="truncate text-red-300">Delete chat?</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleConfirmDelete(conv._id, e)}
                              className="rounded bg-red-700 px-2 py-0.5 font-medium text-white hover:bg-red-600"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                              className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300 hover:bg-zinc-700"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={conv._id}
                        onClick={() => {
                          onSelectConversation(conv._id);
                          if (onClose) onClose();
                        }}
                        className={`group relative flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                          isActive
                            ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700"
                            : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <svg
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isActive ? "text-indigo-400" : "text-zinc-500"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <span className="truncate">{conv.title || "New Conversation"}</span>
                        </div>

                        {/* Action buttons on hover / active */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(conv, e)}
                            title="Rename"
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(conv._id);
                            }}
                            title="Delete"
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 md:flex md:flex-col overflow-hidden">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-50 flex h-full w-72 flex-col bg-zinc-950 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationSidebar;
