import { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { client } from "~/utils/ApiClient";
import { AuthLayout, fieldClass, submitClass } from "./AuthLayout";

const MESSAGES: Record<string, string> = {
  missing: "Enter your email and password.",
  unknown: "We don't recognise that email.",
  invalid: "That password isn't right.",
};

/**
 * Sign in to manage the business.
 *
 * @returns the rendered login page.
 */
function Login() {
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    try {
      const response = await client.post("/auth.signIn", { email, password });
      if (response.data?.ok) {
        history.push("/dashboard");
        return;
      }
      setError(MESSAGES[response.data?.reason] ?? "Could not sign you in.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      description="Manage boarding, the till and your books."
      footer={
        <>
          No account yet?{" "}
          <Link to="/signup" className="font-semibold text-indigo-600">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error ? (
          <p
            data-testid="login-error"
            className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-900"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />

        <label
          htmlFor="password"
          className="mt-4 block text-sm font-medium text-gray-900"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={fieldClass}
        />

        <button type="submit" disabled={isSaving} className={submitClass}>
          {isSaving ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-indigo-600">
          Forgot your password?
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
