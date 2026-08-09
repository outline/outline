import { useState } from "react";
import { Link } from "react-router-dom";
import { client } from "~/utils/ApiClient";
import { AuthLayout, fieldClass, submitClass } from "./AuthLayout";

/**
 * Request a password reset link.
 *
 * The response is the same whether or not the address has an account, so the
 * form cannot be used to discover who is registered.
 *
 * @returns the rendered forgot password page.
 */
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    try {
      const response = await client.post("/auth.forgotPassword", { email });
      if (response.data?.ok) {
        setSent(true);
        return;
      }
      setError("Enter a valid email address.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="We'll email you a link to set a new one."
      footer={
        <Link to="/login" className="font-semibold text-indigo-600">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p
          data-testid="forgot-result"
          className="rounded-md bg-green-50 p-3 text-sm text-green-800"
        >
          If that address has an account, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          {error ? (
            <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <label
            htmlFor="forgot-email"
            className="block text-sm font-medium text-gray-900"
          >
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />

          <button type="submit" disabled={isSaving} className={submitClass}>
            {isSaving ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;
