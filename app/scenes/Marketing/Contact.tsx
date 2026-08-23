import { useState } from "react";
import { client } from "~/utils/ApiClient";
import { MarketingLayout } from "./MarketingLayout";
const fieldClass =
  "mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm";
/**
 * Get in touch.
 *
 * The form records the message rather than pretending to send, and says what
 * is missing when it will not go.
 *
 * @returns the rendered contact page.
 */
function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    try {
      const response = await client.post("/contact.submit", {
        name,
        email,
        message,
      });
      if (response.data?.ok) {
        setSent(true);
        return;
      }
      setError("Give us your name, a valid email, and a line or two.");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <MarketingLayout
      title="Contact us"
      description="Questions about boarding, the software, or an order."
    >
      {sent ? (
        <p
          data-testid="contact-result"
          className="rounded-md bg-green-50 p-4 text-sm text-green-800"
        >
          Thanks — we'll reply to that address within a working day.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-lg">
          {error ? (
            <p
              data-testid="contact-error"
              className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-900"
          >
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />

          <label
            htmlFor="contact-email"
            className="mt-6 block text-sm font-medium text-gray-900"
          >
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />

          <label
            htmlFor="message"
            className="mt-6 block text-sm font-medium text-gray-900"
          >
            Message
          </label>
          <textarea
            id="message"
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className={fieldClass}
          />

          <button
            type="submit"
            disabled={isSaving}
            className="mt-6 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSaving ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </MarketingLayout>
  );
}
export default Contact;
