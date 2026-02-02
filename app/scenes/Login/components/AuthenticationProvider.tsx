import { startAuthentication } from "@simplewebauthn/browser";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { Client } from "@shared/types";
import ButtonLarge from "~/components/ButtonLarge";
import InputLarge from "~/components/InputLarge";
import PluginIcon from "~/components/PluginIcon";
import Tooltip from "~/components/Tooltip";
import { client } from "~/utils/ApiClient";
import Desktop from "~/utils/Desktop";
import { getRedirectUrl } from "../urls";
import { CSRF } from "@shared/constants";
import { getCookie } from "tiny-cookie";

type Props = React.ComponentProps<typeof ButtonLarge> & {
  id: string;
  name: string;
  authUrl: string;
  isCreate: boolean;
  onEmailSuccess: (email: string) => void;
  preferOTP: boolean;
  onPasswordExpand?: () => void;
  onForgotPassword?: () => void;
};

type AuthState = "initial" | "email" | "code" | "password";

function AuthenticationProvider(props: Props) {
  const { t } = useTranslation();
  const [authState, setAuthState] = React.useState<AuthState>("initial");
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  const {
    isCreate,
    id,
    name,
    authUrl,
    onEmailSuccess,
    preferOTP,
    onPasswordExpand,
    onForgotPassword,
    ...rest
  } = props;
  const clientType = Desktop.isElectron() ? Client.Desktop : Client.Web;

  const handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleChangePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
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
    const handleSubmitPasskey = async (
      event: React.SyntheticEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

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
          const createInputs = (obj: any, prefix = "") => {
            Object.entries(obj).forEach(([key, value]) => {
              const fieldName = prefix ? `${prefix}[${key}]` : key;

              if (value && typeof value === "object" && !Array.isArray(value)) {
                createInputs(value, fieldName);
              } else {
                // Create hidden input for primitive values
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = fieldName;
                input.value = String(value);
                formRef.current?.appendChild(input);
              }
            });
          };

          createInputs({
            ...authResp,
            challengeId,
            [CSRF.fieldName]: getCookie(CSRF.cookieName),
            client: clientType,
          });
        }

        // Submit form natively to let browser handle redirect and cookies
        formRef.current?.submit();
      } catch (err) {
        toast.error(err.message);
      }
    };

    const isDesktop = Desktop.isElectron();
    const button = (
      <ButtonLarge
        type="submit"
        icon={<PluginIcon id={id} color="currentColor" />}
        fullwidth
        disabled={isDesktop}
        {...rest}
      >
        {t("Continue with Passkey")}
      </ButtonLarge>
    );

    return (
      <Wrapper>
        <Form
          ref={formRef}
          method="POST"
          action="/auth/passkeys.verifyAuthentication"
          onSubmit={handleSubmitPasskey}
        >
          {isDesktop ? (
            <Tooltip
              content={t("Passkeys are not supported in the desktop app")}
            >
              {button}
            </Tooltip>
          ) : (
            button
          )}
        </Form>
      </Wrapper>
    );
  }

  if (id === "email") {
    return null;
  }

  if (id === "password") {
    const csrfToken = getCookie(CSRF.cookieName) ?? "";

    if (authState !== "password") {
      return (
        <Wrapper>
          <ButtonLarge
            type="button"
            icon={<EmailIcon />}
            fullwidth
            onClick={() => {
              setAuthState("password");
              onPasswordExpand?.();
            }}
            {...rest}
          >
            {t("Continue with password")}
          </ButtonLarge>
        </Wrapper>
      );
    }

    return (
      <Wrapper>
        <StackedForm method="POST" action="/auth/password">
          <input type="hidden" name={CSRF.fieldName} value={csrfToken} />
          <InputLarge
            type="email"
            name="email"
            placeholder="me@domain.com"
            value={email}
            onChange={handleChangeEmail}
            disabled={isSubmitting}
            required
          />
          <InputLarge
            type="password"
            name="password"
            placeholder={t("Password")}
            value={password}
            onChange={handleChangePassword}
            disabled={isSubmitting}
            required
          />
          <ButtonLarge
            type="submit"
            disabled={isSubmitting}
            onClick={() => setSubmitting(true)}
            fullwidth
            {...rest}
          >
            {t("Sign In")} →
          </ButtonLarge>
          {onForgotPassword ? (
            <ForgotPasswordButton
              type="button"
              onClick={onForgotPassword}
              disabled={isSubmitting}
            >
              {t("Forgot password?")}
            </ForgotPasswordButton>
          ) : null}
        </StackedForm>
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

const StackedForm = styled(Form)`
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
`;

const ForgotPasswordButton = styled.button`
  background: none;
  border: 0;
  color: ${(props) => props.theme.textSecondary};
  cursor: pointer;
  font-size: 14px;
  padding: 4px 0 0;
  text-decoration: underline;
  text-align: left;
`;

export default AuthenticationProvider;
