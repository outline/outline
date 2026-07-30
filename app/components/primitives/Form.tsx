import { useCallback, useRef } from "react";
import { CSRF } from "@shared/constants";
import { getCSRFToken } from "~/utils/csrf";

/**
 * Form component that automatically includes a CSRF token as a hidden input
 * field, read from the cookie at submission time.
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
        tokenRef.current.value = getCSRFToken();
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
        defaultValue={getCSRFToken()}
      />
      {children}
    </form>
  );
};
