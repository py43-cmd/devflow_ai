import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Alert from "../../components/common/Alert";
import TextField from "../../components/common/TextField";
import AuthLayout from "../../components/layout/AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/getErrorMessage";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing your projects with AI"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Alert>{error}</Alert>

        <TextField
          id="name"
          label="Full Name"
          value={form.name}
          onChange={handleChange}
          placeholder="Priyanshu"
          autoComplete="name"
        />

        <TextField
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          minLength={6}
        />

        <button
          type="submit"
          disabled={submitting}
          className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="relative z-10">
            {submitting ? "Creating account..." : "Create Account"}
          </span>
          <span className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;
