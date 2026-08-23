import { useState } from "react";
import { Link } from "react-router-dom";
import { client } from "~/utils/ApiClient";
import { AuthLayout, fieldClass, submitClass } from "./AuthLayout";
const MESSAGES: Record<string, string> = {
  short: "Use at least 8 characters.",
  mismatch: "Those passwords don't match.",
};
/**
 * Set a new password from a reset link.
 *
 * @returns the rendered reset password page.
 */
function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    try {
      const response = await client.post("/auth.resetPassword", {
        password,
        confirm,
      });
      if (response.data?.ok) {
        setDone(true);
        return;
      }
      setError(
        MESSAGES[response.data?.reason] ?? "Could not set the password."
      );
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <AuthLayout
      title="Choose a new password"
      footer={
        <Link to="/login" className="font-semibold text-indigo-600">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <p
          data-testid="reset-result"
          className="rounded-md bg-green-50 p-3 text-sm text-green-800"
        >
          Password updated. You can sign in with it now.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          {error ? (
            <p
              data-testid="reset-error"
              className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-gray-900"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />

          <label
            htmlFor="confirm-password"
            className="mt-4 block text-sm font-medium text-gray-900"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={fieldClass}
          />

          <button type="submit" disabled={isSaving} className={submitClass}>
            {isSaving ? "Saving…" : "Set password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
export default ResetPassword;
