import { useState } from "react";
import { Link } from "react-router-dom";
import { PetsoClientError } from "@treonstudio/petso-lib";
import useStores from "~/hooks/useStores";
import { petsoClient } from "~/utils/petsoClient";
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
  const { auth } = useStores();
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    try {
      await petsoClient.auth.signup({
        businessName,
        fullName,
        email,
        password,
      });
      await auth.fetchAuth();
      window.location.href = "/dashboard";
    } catch (error) {
      if (error instanceof PetsoClientError && error.status === 409) {
        setError(MESSAGES.taken);
      } else if (error instanceof PetsoClientError && error.status === 422) {
        setError(MESSAGES.missing);
      } else {
        setError("Could not create the account.");
      }
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
          htmlFor="signup-name"
          className="mt-4 block text-sm font-medium text-gray-900"
        >
          Your name
        </label>
        <input
          id="signup-name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
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

        <label
          htmlFor="signup-password"
          className="mt-4 block text-sm font-medium text-gray-900"
        >
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={fieldClass}
        />

        <button type="submit" disabled={isSaving} className={submitClass}>
          {isSaving ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
export default Signup;
