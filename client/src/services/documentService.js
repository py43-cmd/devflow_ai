import api from "./api";

export const uploadProjectDocument = async (projectId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/projects/${projectId}/documents`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getProjectDocuments = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/documents`);
  return response.data;
};

export const getProjectDocument = async (projectId, documentId) => {
  const response = await api.get(`/projects/${projectId}/documents/${documentId}`);
  return response.data;
};

export const getDocumentStatus = async (projectId, documentId) => {
  const response = await api.get(`/projects/${projectId}/documents/${documentId}/status`);
  return response.data;
};

export const retryDocumentIngestion = async (projectId, documentId) => {
  const response = await api.post(
    `/projects/${projectId}/documents/${documentId}/retry`
  );
  return response.data;
};

export const deleteProjectDocument = async (projectId, documentId) => {
  const response = await api.delete(`/projects/${projectId}/documents/${documentId}`);
  return response.data;
};

export const searchProjectKnowledge = async (
  projectId,
  { query, topK = 5, minScore = 0.2 } = {}
) => {
  const response = await api.post(`/projects/${projectId}/knowledge/search`, {
    query,
    topK,
    minScore,
  });
  return response.data;
};
