import { useCallback, useEffect, useState } from "react";

import CodeReviewForm from "../../components/review/CodeReviewForm";
import CodeReviewResults from "../../components/review/CodeReviewResults";
import { getProjects } from "../../services/projectService";
import { reviewCode } from "../../services/codeReviewService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PROGRESS_MESSAGES = [
  "Reading the source code",
  "Checking for bugs and edge cases",
  "Scanning for security issues",
  "Evaluating performance",
  "Assessing readability and maintainability",
  "Preparing the review",
];

const CodeReview = () => {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [projectId, setProjectId] = useState("");

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
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
    if (!reviewing) {
      return undefined;
    }

    const timer = setInterval(() => {
      setProgressIndex((index) => (index + 1) % PROGRESS_MESSAGES.length);
    }, 2200);

    return () => clearInterval(timer);
  }, [reviewing]);

  const handleReview = async () => {
    setError("");
    setReview(null);
    setProgressIndex(0);
    setReviewing(true);

    try {
      const data = await reviewCode({ code, language, projectId });
      setReview(data.data.review);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
          AI Code Review
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Paste code and get structured feedback on bugs, security, performance,
          quality, and maintainability.
        </p>
      </div>

      <CodeReviewForm
        code={code}
        onCodeChange={setCode}
        language={language}
        onLanguageChange={setLanguage}
        projectId={projectId}
        onProjectChange={setProjectId}
        projects={projects}
        projectsLoading={projectsLoading}
        onSubmit={handleReview}
        reviewing={reviewing}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      {reviewing ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="flex items-center gap-2 text-sm text-zinc-200">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
            Reviewing your code...
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {PROGRESS_MESSAGES[progressIndex]}
          </p>
        </div>
      ) : review ? (
        <CodeReviewResults review={review} />
      ) : null}
    </div>
  );
};

export default CodeReview;
