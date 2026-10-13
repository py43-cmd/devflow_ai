import api from "./api";

export const getBugs = async (projectId, params = {}) => {
  const response = await api.get(`/projects/${projectId}/bugs`, { params });
  return response.data;
};

export const getBug = async (bugId) => {
  const response = await api.get(`/bugs/${bugId}`);
  return response.data;
};

export const createBug = async (projectId, bugData) => {
  const response = await api.post(`/projects/${projectId}/bugs`, bugData);
  return response.data;
};

export const updateBug = async (bugId, bugData) => {
  const response = await api.put(`/bugs/${bugId}`, bugData);
  return response.data;
};

export const deleteBug = async (bugId) => {
  const response = await api.delete(`/bugs/${bugId}`);
  return response.data;
};

export const analyzeBug = async (bugId) => {
  const response = await api.post(`/bugs/${bugId}/analyze`);
  return response.data;
};
