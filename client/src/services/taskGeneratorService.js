import api from "./api";

export const generateTasks = async ({
  projectId,
  goal,
  constraints,
  context,
  maxTasks,
}) => {
  const payload = { projectId, goal };

  if (constraints) {
    payload.constraints = constraints;
  }

  if (context) {
    payload.context = context;
  }

  if (maxTasks) {
    payload.maxTasks = maxTasks;
  }

  const response = await api.post("/ai/tasks/generate", payload);
  return response.data;
};
