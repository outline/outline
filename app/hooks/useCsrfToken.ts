import { CSRF } from "@shared/constants";
import { useState, useEffect } from "react";
import { getCookie } from "tiny-cookie";

/**
 * React hook for accessing CSRF tokens in components
 *
 * @returns The CSRF token string or null if not found
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const updateToken = () => {
      const currentToken = getCookie(CSRF.cookieName);

      setToken(currentToken);
    };

    // Initial load
    updateToken();

    // Listen for cookie changes (when navigating or refreshing)
    const interval = setInterval(updateToken, 1000);

    return () => clearInterval(interval);
  }, []);

  return token;
}
