// Builds a limited, prioritized snapshot of project data for the LLM.
// Only the fields below are ever included. Passwords, tokens, API keys,
// error stacks, and raw code are never part of the context.

const MAX_TASKS = 50;
const MAX_BUGS = 50;
const MAX_DESCRIPTION = 500;
const MAX_PROJECT_DESCRIPTION = 1000;
const MAX_TOTAL_CHARS = 20000;

const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const TASK_STATUS_RANK = { IN_PROGRESS: 0, TODO: 1, REVIEW: 2, DONE: 3 };
const BUG_STATUS_RANK = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const BUG_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const BUG_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const truncate = (value, max) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
};

const assigneeName = (item) => {
  const assignee = item && item.assignee;
  if (!assignee) {
    return null;
  }
  if (typeof assignee === "object" && assignee.name) {
    return assignee.name;
  }
  return null;
};

const mapTask = (task) => ({
  title: truncate(task.title, 150),
  description: truncate(task.description, MAX_DESCRIPTION),
  status: task.status || "TODO",
  priority: task.priority || "MEDIUM",
  assignee: assigneeName(task),
  dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
  estimatedHours: Number(task.estimatedHours) || 0,
  tags: Array.isArray(task.tags) ? task.tags.slice(0, 10) : [],
});

const mapBug = (bug) => ({
  title: truncate(bug.title, 200),
  description: truncate(bug.description, MAX_DESCRIPTION),
  severity: bug.severity || "MEDIUM",
  status: bug.status || "OPEN",
  language: bug.language || "",
  assignee: assigneeName(bug),
});

const taskTimestamp = (task) =>
  task.createdAt ? new Date(task.createdAt).getTime() : 0;

const sortTasks = (tasks) =>
  tasks.slice().sort((a, b) => {
    const statusDiff =
      (TASK_STATUS_RANK[a.status] ?? 9) - (TASK_STATUS_RANK[b.status] ?? 9);
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const priorityDiff =
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return taskTimestamp(b) - taskTimestamp(a);
  });

const sortBugs = (bugs) =>
  bugs.slice().sort((a, b) => {
    const severityDiff =
      (PRIORITY_RANK[a.severity] ?? 9) - (PRIORITY_RANK[b.severity] ?? 9);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    const statusDiff =
      (BUG_STATUS_RANK[a.status] ?? 9) - (BUG_STATUS_RANK[b.status] ?? 9);
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return taskTimestamp(b) - taskTimestamp(a);
  });

const zeroCounts = (keys) =>
  Object.fromEntries(keys.map((key) => [key, 0]));

const computeStats = (tasks, bugs) => {
  const now = Date.now();
  const taskStatus = zeroCounts(TASK_STATUSES);
  const taskPriority = zeroCounts(TASK_PRIORITIES);
  let overdue = 0;

  for (const task of tasks) {
    taskStatus[task.status || "TODO"] += 1;
    taskPriority[task.priority || "MEDIUM"] += 1;
    if ((task.status || "TODO") !== "DONE" && task.dueDate) {
      const due = new Date(task.dueDate).getTime();
      if (Number.isFinite(due) && due < now) {
        overdue += 1;
      }
    }
  }

  const bugSeverity = zeroCounts(BUG_SEVERITIES);
  const bugStatus = zeroCounts(BUG_STATUSES);

  for (const bug of bugs) {
    bugSeverity[bug.severity || "MEDIUM"] += 1;
    bugStatus[bug.status || "OPEN"] += 1;
  }

  return {
    tasks: {
      total: tasks.length,
      byStatus: taskStatus,
      byPriority: taskPriority,
      overdue,
    },
    bugs: {
      total: bugs.length,
      bySeverity: bugSeverity,
      byStatus: bugStatus,
    },
  };
};

const buildProjectContext = ({ project = {}, tasks = [], bugs = [] } = {}) => {
  const projectInfo = {
    name: truncate(project.name, 200) || "Untitled project",
    description: truncate(project.description, MAX_PROJECT_DESCRIPTION),
    status: project.status || "ACTIVE",
    technologies: Array.isArray(project.technologies)
      ? project.technologies.slice(0, 20)
      : [],
  };

  const details = {
    project: projectInfo,
    tasks: sortTasks(tasks).slice(0, MAX_TASKS).map(mapTask),
    bugs: sortBugs(bugs).slice(0, MAX_BUGS).map(mapBug),
  };

  // Enforce the total context budget by dropping the least important items
  // (the tails of the already-prioritized lists).
  const measure = () => JSON.stringify(details).length;
  let guard = 0;

  while (details.tasks.length + details.bugs.length > 0 && measure() > MAX_TOTAL_CHARS && guard < 500) {
    guard += 1;

    if (details.tasks.length >= details.bugs.length && details.tasks.length > 0) {
      details.tasks.pop();
    } else if (details.bugs.length > 0) {
      details.bugs.pop();
    } else {
      details.tasks.pop();
    }
  }

  return {
    project: projectInfo,
    stats: computeStats(tasks, bugs),
    tasks: details.tasks,
    bugs: details.bugs,
    meta: {
      totalTasks: tasks.length,
      totalBugs: bugs.length,
      tasksIncluded: details.tasks.length,
      bugsIncluded: details.bugs.length,
      sizeChars: measure(),
      truncated: details.tasks.length < tasks.length || details.bugs.length < bugs.length,
    },
  };
};

module.exports = { buildProjectContext, MAX_TASKS, MAX_BUGS, MAX_TOTAL_CHARS };