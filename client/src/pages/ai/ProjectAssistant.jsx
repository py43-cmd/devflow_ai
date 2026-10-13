import { useCallback, useEffect, useRef, useState } from "react";

import AssistantMessage from "../../components/ai/AssistantMessage";
import UserMessage from "../../components/ai/UserMessage";
import ConversationSidebar from "../../components/ai/ConversationSidebar";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import EmptyState from "../../components/common/EmptyState";
import { getProjects } from "../../services/projectService";
import {
  getConversations,
  createConversation,
  getConversationMessages,
  sendConversationMessage,
  renameConversation,
  deleteConversation,
} from "../../services/conversationService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const SUGGESTIONS = [
  "What should I work on next?",
  "What are the most critical bugs?",
  "Give me a project status summary.",
  "Which tasks are still pending?",
  "What should we prioritize?",
];

const ACTIVE_CONV_STORAGE_KEY = "devflow_active_conversation_id";

const ProjectAssistant = () => {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectsError, setProjectsError] = useState("");

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState("");
  const [activeConversationId, setActiveConversationId] = useState("");

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const endRef = useRef(null);
  const activeConvIdRef = useRef("");

  // Keep ref in sync to avoid race conditions
  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
    if (activeConversationId) {
      localStorage.setItem(ACTIVE_CONV_STORAGE_KEY, activeConversationId);
    }
  }, [activeConversationId]);

  // Load projects
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError("");

    try {
      const data = await getProjects();
      const list = data.data.projects || [];
      setProjects(list);
      setSelectedProjectId((current) => current || list[0]?._id || "");
    } catch {
      setProjects([]);
      setProjectsError("Unable to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError("");

    try {
      const res = await getConversations(selectedProjectId || undefined);
      const list = res.data?.conversations || [];
      setConversations(list);

      // Restore stored or default conversation
      const savedId = localStorage.getItem(ACTIVE_CONV_STORAGE_KEY);
      const foundSaved = list.find((c) => c._id === savedId);

      if (foundSaved) {
        setActiveConversationId(foundSaved._id);
      } else if (list.length > 0) {
        setActiveConversationId(list[0]._id);
      } else {
        setActiveConversationId("");
        setMessages([]);
      }
    } catch {
      setConversations([]);
      setConversationsError("Unable to load chat history.");
    } finally {
      setConversationsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      setSendError("");
      try {
        const res = await getConversationMessages(activeConversationId);
        // Only update if conversation didn't change mid-request
        if (activeConvIdRef.current === activeConversationId) {
          setMessages(res.data?.messages || []);
        }
      } catch {
        if (activeConvIdRef.current === activeConversationId) {
          setMessages([]);
        }
      } finally {
        if (activeConvIdRef.current === activeConversationId) {
          setMessagesLoading(false);
        }
      }
    };

    fetchMessages();
  }, [activeConversationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const handleNewConversation = async () => {
    try {
      const res = await createConversation({
        projectId: selectedProjectId || undefined,
        title: "New Conversation",
      });
      const newConv = res.data?.conversation;
      if (newConv) {
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv._id);
        setMessages([]);
        setQuestion("");
        setSendError("");
      }
    } catch (err) {
      setConversationsError(getErrorMessage(err));
    }
  };

  const handleRenameConversation = async (convId, newTitle) => {
    try {
      const res = await renameConversation(convId, newTitle);
      const updated = res.data?.conversation;
      if (updated) {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, title: updated.title } : c))
        );
      }
    } catch (err) {
      setConversationsError(getErrorMessage(err));
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));

      if (activeConversationId === convId) {
        const remaining = conversations.filter((c) => c._id !== convId);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0]._id);
        } else {
          setActiveConversationId("");
          setMessages([]);
        }
      }
    } catch (err) {
      setConversationsError(getErrorMessage(err));
    }
  };

  const sendQuestion = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || sending) {
      return;
    }

    setSendError("");
    setSending(true);

    let targetConvId = activeConversationId;

    // Create a new conversation if none is active
    if (!targetConvId) {
      try {
        const convRes = await createConversation({
          projectId: selectedProjectId || undefined,
          title: trimmed.length > 40 ? `${trimmed.slice(0, 37)}...` : trimmed,
        });
        const created = convRes.data?.conversation;
        if (created) {
          targetConvId = created._id;
          setActiveConversationId(created._id);
          setConversations((prev) => [created, ...prev]);
        }
      } catch (err) {
        setSendError(getErrorMessage(err));
        setSending(false);
        return;
      }
    }

    // Optimistically add user message
    const tempUserMsg = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setQuestion("");

    try {
      const res = await sendConversationMessage(targetConvId, trimmed);
      const { userMessage, assistantMessage } = res.data || {};

      if (activeConvIdRef.current === targetConvId) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m._id !== tempUserMsg._id);
          return [
            ...filtered,
            userMessage || tempUserMsg,
            assistantMessage,
          ].filter(Boolean);
        });
      }

      // Refresh conversation list to bump recent chat and reflect auto-title
      loadConversations();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      setSendError(errorMsg);

      if (activeConvIdRef.current === targetConvId) {
        setMessages((prev) => [
          ...prev,
          {
            _id: `error-${Date.now()}`,
            role: "assistant",
            isError: true,
            content: errorMsg,
            failedPrompt: trimmed,
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuestion(question);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuestion(question);
    }
  };

  const showSuggestions = messages.length === 0 && !sending && !messagesLoading;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col space-y-4">
      {/* Top Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 md:hidden hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Chats
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-100">Project AI Assistant</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-900/60 bg-indigo-950/50 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                RAG Knowledge Active
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Persistent conversations grounded in your indexed documents, source code, tasks, and bugs.
            </p>
          </div>

        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="project-select" className="text-xs font-medium text-zinc-400">
            Project:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={projectsLoading || projects.length === 0}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {projectsError && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {projectsError}
        </div>
      )}

      {/* Main Workspace: Sidebar + Chat Box */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewConversation={handleNewConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          loading={conversationsLoading}
          error={conversationsError}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Chat Area */}
        <div className="flex flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 min-w-0">
          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            {projectsLoading ? (
              <Loading label="Loading projects..." />
            ) : projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Create a project first, then ask the AI Assistant about it."
                actionLabel="Go to projects"
                onAction={() => {
                  window.location.href = "/projects";
                }}
              />
            ) : messagesLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loading label="Loading message history..." />
              </div>
            ) : showSuggestions ? (
              <div className="flex h-full flex-col items-center justify-center py-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mt-3 font-semibold text-zinc-100">How can I assist your project?</h3>
                <p className="mt-1 text-center text-xs text-zinc-400 max-w-sm">
                  Ask questions about tasks, open bugs, priorities, or request technical recommendations.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-lg">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendQuestion(suggestion)}
                      className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-indigo-600 hover:text-indigo-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) =>
                message.role === "user" ? (
                  <UserMessage key={message._id || message.id} content={message.content} />
                ) : (
                  <AssistantMessage
                    key={message._id || message.id}
                    message={message}
                    onRetry={
                      message.failedPrompt ? () => sendQuestion(message.failedPrompt) : null
                    }
                  />
                )
              )
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-xs text-zinc-400">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.4s]" />
                  </div>
                  AI is analyzing your project and prior conversation...
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-zinc-800 pt-3 mt-2"
          >
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
              disabled={sending || projects.length === 0}
              className="max-h-32 min-h-[42px] flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60 leading-relaxed"
            />
            <Button
              type="submit"
              disabled={sending || projects.length === 0 || !question.trim()}
              className="px-4 py-2 text-xs shrink-0"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectAssistant;