import api from "./api";

export const getConversations = async (projectId) => {
  const params = {};
  if (projectId) {
    params.projectId = projectId;
  }
  const response = await api.get("/conversations", { params });
  return response.data;
};

export const createConversation = async ({ projectId, title } = {}) => {
  const payload = {};
  if (projectId) {
    payload.projectId = projectId;
  }
  if (title) {
    payload.title = title;
  }
  const response = await api.post("/conversations", payload);
  return response.data;
};

export const getConversationMessages = async (
  conversationId,
  { page = 1, limit = 50 } = {}
) => {
  const response = await api.get(`/conversations/${conversationId}/messages`, {
    params: { page, limit },
  });
  return response.data;
};

export const sendConversationMessage = async (conversationId, content) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, {
    content,
  });
  return response.data;
};

export const renameConversation = async (conversationId, title) => {
  const response = await api.patch(`/conversations/${conversationId}`, {
    title,
  });
  return response.data;
};

export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/conversations/${conversationId}`);
  return response.data;
};
