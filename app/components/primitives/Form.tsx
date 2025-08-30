import { CSRF } from "@shared/constants";
import { useCsrfToken } from "~/hooks/useCsrfToken";

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
