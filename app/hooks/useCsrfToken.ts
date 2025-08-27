import { useState, useEffect } from "react";
import { getCookie } from "tiny-cookie";

/**
 * React hook for accessing` CSRF tokens in components
 * @param cookieName The name of the CSRF cookie (default: 'XSRF-TOKEN')
 * @returns Object containing the current CSRF token and validation status
 */
export function useCsrfToken(cookieName: string = "XSRF-TOKEN") {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const updateToken = () => {
      const currentToken = getCookie(cookieName);

      setToken(currentToken);
    };

    // Initial load
    updateToken();

    // Listen for cookie changes (when navigating or refreshing)
    const interval = setInterval(updateToken, 1000);

    return () => clearInterval(interval);
  }, [cookieName]);

  return {
    token,
    hasToken: !!token,
  };
}

/**
 * Hook that returns a function to add CSRF token to form data
 * @param cookieName The name of the CSRF cookie
 * @param fieldName The name of the form field for the CSRF token
 */
export function useCsrfFormData(
  cookieName: string = "XSRF-TOKEN",
  fieldName: string = "_csrf"
) {
  const { token } = useCsrfToken(cookieName);

  return (data: Record<string, any> = {}): FormData => {
    const formData = new FormData();

    // Add CSRF token if available
    if (token) {
      formData.append(fieldName, token);
    }

    // Add other data
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((item) => formData.append(`${key}[]`, String(item)));
      } else if (value != null) {
        formData.append(key, String(value));
      }
    });

    return formData;
  };
}
