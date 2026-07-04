import { useCallback, useRef } from "react";
import { getCookie } from "tiny-cookie";
import { CSRF } from "@shared/constants";

/**
 * Form component that automatically includes a CSRF token as a hidden input
 * field. The token is re-read from the cookie when the form is submitted, as
 * the server rotates the token and a value captured at render time may have
 * become stale by submission.
 */
export const Form = ({
  children,
  onSubmit,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) => {
  const tokenRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      if (tokenRef.current) {
        tokenRef.current.value = getCookie(CSRF.cookieName) ?? "";
      }
      onSubmit?.(event);
    },
    [onSubmit]
  );

  return (
    <form {...props} onSubmit={handleSubmit}>
      <input
        ref={tokenRef}
        type="hidden"
        name={CSRF.fieldName}
        defaultValue={getCookie(CSRF.cookieName) ?? ""}
      />
      {children}
    </form>
  );
};
