import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import BugDetails from "./pages/dashboard/BugDetails";
import Bugs from "./pages/dashboard/Bugs";
import CodeReview from "./pages/dashboard/CodeReview";
import Documentation from "./pages/dashboard/Documentation";
import ProjectAssistant from "./pages/ai/ProjectAssistant";
import ProjectDetails from "./pages/dashboard/ProjectDetails";
import Projects from "./pages/dashboard/Projects";
import TaskDetails from "./pages/dashboard/TaskDetails";
import TaskGenerator from "./pages/dashboard/TaskGenerator";
import Tasks from "./pages/dashboard/Tasks";
import ProtectedRoute from "./routes/ProtectedRoute";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:id" element={<TaskDetails />} />
          <Route path="/bugs" element={<Bugs />} />
          <Route path="/bugs/:id" element={<BugDetails />} />
          <Route path="/code-review" element={<CodeReview />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/ai-assistant" element={<ProjectAssistant />} />
          <Route path="/task-generator" element={<TaskGenerator />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
