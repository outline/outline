import { startAuthentication } from "@simplewebauthn/browser";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { getCookie } from "tiny-cookie";
import { CSRF } from "@shared/constants";
import { Client } from "@shared/types";
import { errToString } from "@shared/utils/error";
import ButtonLarge from "~/components/ButtonLarge";
import PluginIcon from "~/components/PluginIcon";
import useQuery from "~/hooks/useQuery";
import { client } from "~/utils/ApiClient";
import Desktop from "~/utils/Desktop";

type Props = React.ComponentProps<typeof ButtonLarge>;

/**
 * Flattens a nested object into form field entries using bracket notation
 * (e.g. `response[authenticatorData]`) so the values can be rendered as hidden
 * inputs and submitted as a regular form.
 *
 * @param obj The object to flatten.
 * @param prefix Internal accumulator for nested field names.
 * @param out Internal accumulator for the flattened result.
 * @returns A flat map of field name to string value.
 */
function flattenFormFields(
  obj: Record<string, unknown>,
  prefix = "",
  out: Record<string, string> = {}
): Record<string, string> {
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const fieldName = prefix ? `${prefix}[${key}]` : key;

    if (typeof value === "object" && !Array.isArray(value)) {
      flattenFormFields(value as Record<string, unknown>, fieldName, out);
    } else {
      out[fieldName] = String(value as string | number | boolean);
    }
  });

  return out;
}

/**
 * Renders the "Continue with Passkey" login option and runs the WebAuthn
 * authentication ceremony.
 *
 * In the desktop app the ceremony cannot run inside Electron's Chromium, so the
 * flow is opened in the system browser and the resulting session is returned to
 * the app via the outline:// deep link, mirroring the SSO desktop flow.
 */
export function PasskeyAuthenticationProvider(props: Props) {
  const { t } = useTranslation();
  const query = useQuery();
  const formRef = React.useRef<HTMLFormElement>(null);
  const hasAutoStarted = React.useRef(false);
  const [fields, setFields] = React.useState<Record<string, string> | null>(
    null
  );
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  // True when this page was opened in the system browser from the desktop app
  // to complete a passkey login (see the /auth/passkey route). In that case the
  // resulting session must be handed back to the desktop app rather than the
  // browser.
  const isDesktopRedirect =
    query.get("method") === "passkey" && query.get("client") === Client.Desktop;

  // When returning to the system browser from the desktop app the ceremony is
  // triggered automatically, so the button is hidden behind the "Signing in"
  // screen. It is revealed again if the ceremony fails so the user can retry.
  const autoStarting = isDesktopRedirect && !Desktop.isElectron();

  const runAuthentication = React.useCallback(async (verifyClient: Client) => {
    setIsAuthenticating(true);
    setHasError(false);
    try {
      const resp = await client.post(
        "/passkeys.generateAuthenticationOptions",
        undefined,
        {
          baseUrl: "/auth",
        }
      );
      const { challengeId, ...optionsData } = resp.data;
      const authResp = await startAuthentication(optionsData);

      // Render the authentication response as hidden inputs; the effect below
      // submits the form natively once they're in the DOM so the browser
      // follows the redirect and applies cookies.
      setFields(
        flattenFormFields({
          ...authResp,
          challengeId,
          [CSRF.fieldName]: getCookie(CSRF.cookieName),
          client: verifyClient,
        })
      );
    } catch (err) {
      toast.error(errToString(err));
      // Re-enable the button so the user can retry; on success the form submits
      // and navigates away, so there's no need to reset there.
      setIsAuthenticating(false);
      setHasError(true);
    }
  }, []);

  // Submit the form once the hidden fields from the ceremony have rendered.
  React.useEffect(() => {
    if (fields) {
      formRef.current?.submit();
    }
  }, [fields]);

  // When returning from the desktop app to complete passkey login, start the
  // ceremony automatically once.
  React.useEffect(() => {
    if (isDesktopRedirect && !Desktop.isElectron() && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      void runAuthentication(Client.Desktop);
    }
  }, [isDesktopRedirect, runAuthentication]);

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    // The WebAuthn ceremony cannot run inside Electron's Chromium as it lacks
    // platform authenticator support. Open the flow in the system browser,
    // which returns to the app via the outline:// deep link like SSO login.
    if (Desktop.isElectron()) {
      window.location.href = `/auth/passkey?client=${Client.Desktop}`;
      return;
    }

    void runAuthentication(isDesktopRedirect ? Client.Desktop : Client.Web);
  };

  return (
    <Wrapper>
      <Form
        ref={formRef}
        method="POST"
        action="/auth/passkeys.verifyAuthentication"
        onSubmit={handleSubmit}
      >
        {fields &&
          Object.entries(fields).map(([fieldName, value]) => (
            <input
              key={fieldName}
              type="hidden"
              name={fieldName}
              value={value}
              readOnly
            />
          ))}
        {(!autoStarting || hasError) && (
          <ButtonLarge
            type="submit"
            icon={<PluginIcon id="passkeys" color="currentColor" />}
            fullwidth
            {...props}
            disabled={isAuthenticating}
          >
            {t("Continue with Passkey")}
          </ButtonLarge>
        )}
      </Form>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
`;

const Form = styled.form`
  width: 100%;
  display: flex;
  justify-content: space-between;
`;
