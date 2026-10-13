import api from "./api";

export const reviewCode = async ({ code, language, projectId }) => {
  const payload = { code, language };

  if (projectId) {
    payload.projectId = projectId;
  }

  const response = await api.post("/code-review", payload);
  return response.data;
};
