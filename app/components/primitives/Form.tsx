import { CSRF } from "@shared/constants";
import { useCsrfToken } from "~/hooks/useCsrfToken";

/**
 * Form component that automatically includes a CSRF token as a hidden input field.
 */
export const Form = ({
  children,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) => {
  const token = useCsrfToken();

  return (
    <form {...props}>
      {token && <input type="hidden" name={CSRF.fieldName} value={token} />}
      {children}
    </form>
  );
};
