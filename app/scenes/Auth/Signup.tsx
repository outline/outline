import { useState } from "react";
import { Link } from "react-router-dom";
import { client } from "~/utils/ApiClient";
import { AuthLayout, fieldClass, submitClass } from "./AuthLayout";

const MESSAGES: Record<string, string> = {
  missing: "Enter a business name and a valid email.",
  taken: "There's already an account with that email.",
};

/**
 * Create a business account.
 *
 * @returns the rendered signup page.
 */
function Signup() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    try {
      const response = await client.post("/auth.signUp", {
        businessName,
        email,
      });
      if (response.data?.ok) {
        setDone(response.data.businessName);
        return;
      }
      setError(
        MESSAGES[response.data?.reason] ?? "Could not create the account."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Start with boarding and the till; add the rest as you go."
      footer={
        <>
          Already have one?{" "}
          <Link to="/login" className="font-semibold text-indigo-600">
            Sign in
          </Link>
        </>
      }
    >
      {done ? (
        <p
          data-testid="signup-result"
          className="rounded-md bg-green-50 p-3 text-sm text-green-800"
        >
          {done} is set up. Check your email to confirm the address.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          {error ? (
            <p
              data-testid="signup-error"
              className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <label
            htmlFor="business"
            className="block text-sm font-medium text-gray-900"
          >
            Business name
          </label>
          <input
            id="business"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            className={fieldClass}
          />

          <label
            htmlFor="signup-email"
            className="mt-4 block text-sm font-medium text-gray-900"
          >
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />

          <button type="submit" disabled={isSaving} className={submitClass}>
            {isSaving ? "Creating…" : "Create account"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export default Signup;
