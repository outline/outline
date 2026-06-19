import { startAuthentication } from "@simplewebauthn/browser";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { errToString } from "@shared/utils/error";
import { Client } from "@shared/types";
import ButtonLarge from "~/components/ButtonLarge";
import InputLarge from "~/components/InputLarge";
import PluginIcon from "~/components/PluginIcon";
import useQuery from "~/hooks/useQuery";
import { client } from "~/utils/ApiClient";
import Desktop from "~/utils/Desktop";
import { getRedirectUrl } from "~/utils/urls";
import { CSRF } from "@shared/constants";
import { getCookie } from "tiny-cookie";

type Props = React.ComponentProps<typeof ButtonLarge> & {
  id: string;
  name: string;
  authUrl: string;
  isCreate: boolean;
  onEmailSuccess: (email: string) => void;
  preferOTP: boolean;
};

type AuthState = "initial" | "email" | "code";

function AuthenticationProvider(props: Props) {
  const { t } = useTranslation();
  const query = useQuery();
  const [authState, setAuthState] = React.useState<AuthState>("initial");
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  const hasAutoStartedPasskey = React.useRef(false);
  const { isCreate, id, name, authUrl, onEmailSuccess, preferOTP, ...rest } =
    props;
  const clientType = Desktop.isElectron() ? Client.Desktop : Client.Web;

  // True when this page was opened in the system browser from the desktop app
  // to complete a passkey login (see the /auth/passkey route). In that case the
  // ceremony runs here but the resulting session must be handed back to the
  // desktop app via the outline:// deep link.
  const isPasskeyDesktopRedirect =
    query.get("method") === "passkey" && query.get("client") === Client.Desktop;

  const runPasskeyAuthentication = React.useCallback(
    async (verifyClient: Client) => {
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

        // Populate hidden form fields with authentication data
        if (formRef.current) {
          const createInputs = (obj: Record<string, unknown>, prefix = "") => {
            Object.entries(obj).forEach(([key, value]) => {
              if (value === undefined || value === null) {
                return;
              }

              const fieldName = prefix ? `${prefix}[${key}]` : key;

              if (typeof value === "object" && !Array.isArray(value)) {
                createInputs(value as Record<string, unknown>, fieldName);
              } else {
                // Create hidden input for primitive values
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = fieldName;
                input.value = String(value as string | number | boolean);
                formRef.current?.appendChild(input);
              }
            });
          };

          createInputs({
            ...authResp,
            challengeId,
            [CSRF.fieldName]: getCookie(CSRF.cookieName),
            client: verifyClient,
          });
        }

        // Submit form natively to let browser handle redirect and cookies
        formRef.current?.submit();
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    []
  );

  // When returning from the desktop app to complete passkey login, start the
  // ceremony automatically once.
  React.useEffect(() => {
    if (
      id === "passkeys" &&
      isPasskeyDesktopRedirect &&
      !Desktop.isElectron() &&
      !hasAutoStartedPasskey.current
    ) {
      hasAutoStartedPasskey.current = true;
      void runPasskeyAuthentication(Client.Desktop);
    }
  }, [id, isPasskeyDesktopRedirect, runPasskeyAuthentication]);

  const handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleSubmitEmail = async (
    event: React.SyntheticEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (authState === "email" && email) {
      setSubmitting(true);

      try {
        const response = await client.post(event.currentTarget.action, {
          email,
          client: clientType,
          preferOTP,
        });

        if (response.redirect) {
          window.location.href = response.redirect;
        } else {
          setSubmitting(false);
          onEmailSuccess?.(email);
        }
      } catch (_err) {
        setSubmitting(false);
      }
    } else {
      setAuthState("email");
    }
  };

  const href = getRedirectUrl(authUrl);

  if (id === "passkeys") {
    const handleSubmitPasskey = (
      event: React.SyntheticEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      // The WebAuthn ceremony cannot run inside Electron's Chromium as it lacks
      // platform authenticator support. Open the flow in the system browser,
      // which returns to the app via the outline:// deep link like SSO login.
      if (Desktop.isElectron()) {
        window.location.href = `/auth/passkey?client=${Client.Desktop}`;
        return;
      }

      void runPasskeyAuthentication(
        isPasskeyDesktopRedirect ? Client.Desktop : Client.Web
      );
    };

    return (
      <Wrapper>
        <Form
          ref={formRef}
          method="POST"
          action="/auth/passkeys.verifyAuthentication"
          onSubmit={handleSubmitPasskey}
        >
          <ButtonLarge
            type="submit"
            icon={<PluginIcon id={id} color="currentColor" />}
            fullwidth
            {...rest}
          >
            {t("Continue with Passkey")}
          </ButtonLarge>
        </Form>
      </Wrapper>
    );
  }

  if (id === "email") {
    if (isCreate) {
      return null;
    }

    return (
      <Wrapper>
        <Form method="POST" action="/auth/email" onSubmit={handleSubmitEmail}>
          {authState === "email" ? (
            <>
              <InputLarge
                type="email"
                name="email"
                placeholder="me@domain.com"
                value={email}
                onChange={handleChangeEmail}
                disabled={isSubmitting}
                autoFocus
                required
                short
              />
              <ButtonLarge type="submit" disabled={isSubmitting} {...rest}>
                {t("Sign In")} →
              </ButtonLarge>
            </>
          ) : (
            <ButtonLarge type="submit" icon={<EmailIcon />} fullwidth {...rest}>
              {t("Continue with Email")}
            </ButtonLarge>
          )}
        </Form>
      </Wrapper>
    );
  }

  return (
    <ButtonLarge
      onClick={() => (window.location.href = href)}
      icon={<PluginIcon id={id} />}
      fullwidth
      {...rest}
    >
      {t("Continue with {{ authProviderName }}", {
        authProviderName: name,
      })}
    </ButtonLarge>
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

export default AuthenticationProvider;
