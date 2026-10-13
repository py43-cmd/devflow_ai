import api from "./api";

export const askProjectAssistant = async ({ projectId, question }) => {
  const response = await api.post(`/projects/${projectId}/ai/assistant`, { question });
  return response.data;
};