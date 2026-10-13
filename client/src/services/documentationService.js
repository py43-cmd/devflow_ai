import api from "./api";

export const generateDocumentation = async ({ projectId, endpoint }) => {
  const payload = { endpoint };

  if (projectId) {
    payload.projectId = projectId;
  }

  const response = await api.post("/ai/documentation", payload);
  return response.data;
};
