import { useCallback, useEffect, useState } from "react";

import EndpointForm from "../../components/documentation/EndpointForm";
import DocumentationPreview from "../../components/documentation/DocumentationPreview";
import { getProjects } from "../../services/projectService";
import { generateDocumentation } from "../../services/documentationService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PROGRESS_MESSAGES = [
  "Interpreting the endpoint",
  "Mapping request parameters",
  "Describing responses",
  "Collecting error cases",
  "Writing examples",
  "Formatting the documentation",
];

const Documentation = () => {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [documentation, setDocumentation] = useState(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);

    try {
      const data = await getProjects();
      setProjects(data.data.projects);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!generating) {
      return undefined;
    }

    const timer = setInterval(() => {
      setProgressIndex((index) => (index + 1) % PROGRESS_MESSAGES.length);
    }, 2200);

    return () => clearInterval(timer);
  }, [generating]);

  const handleGenerate = async ({ endpoint, projectId }) => {
    setError("");
    setDocumentation(null);
    setProgressIndex(0);
    setGenerating(true);

    try {
      const data = await generateDocumentation({ projectId, endpoint });
      setDocumentation(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
          AI Documentation Generator
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Describe an endpoint and generate structured API documentation with
          request, response, and error details.
        </p>
      </div>

      <EndpointForm
        projects={projects}
        projectsLoading={projectsLoading}
        onSubmit={handleGenerate}
        generating={generating}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      {generating ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="flex items-center gap-2 text-sm text-zinc-200">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
            Generating documentation...
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {PROGRESS_MESSAGES[progressIndex]}
          </p>
        </div>
      ) : documentation ? (
        <DocumentationPreview documentation={documentation} />
      ) : null}
    </div>
  );
};

export default Documentation;
