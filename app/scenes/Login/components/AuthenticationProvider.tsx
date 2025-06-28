import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Client } from "@shared/types";
import ButtonLarge from "~/components/ButtonLarge";
import InputLarge from "~/components/InputLarge";
import { OneTimePasswordInput } from "~/components/OneTimePasswordInput";
import PluginIcon from "~/components/PluginIcon";
import { client } from "~/utils/ApiClient";
import Desktop from "~/utils/Desktop";
import { getRedirectUrl } from "../urls";

type Props = React.ComponentProps<typeof ButtonLarge> & {
  id: string;
  name: string;
  authUrl: string;
  isCreate: boolean;
  onEmailSuccess: (email: string) => void;
};

type AuthState = "initial" | "email" | "code";

function AuthenticationProvider(props: Props) {
  const { t } = useTranslation();
  const [authState, setAuthState] = React.useState<AuthState>("initial");
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const { isCreate, id, name, authUrl, onEmailSuccess, ...rest } = props;
  const clientType = Desktop.isElectron() ? Client.Desktop : Client.Web;

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
        });

        if (response.redirect) {
          window.location.href = response.redirect;
        } else {
          // Switch to verification code state - no need for separate verify endpoint
          setAuthState("code");
          setSubmitting(false);
        }
      } catch (error) {
        console.error("Error during email authentication:", error);
        setSubmitting(false);
      }
    } else {
      setAuthState("email");
    }
  };

  const href = getRedirectUrl(authUrl);

  if (id === "email") {
    if (isCreate) {
      return null;
    }

    const handleCodeSuccess = React.useCallback(() => {
      onEmailSuccess(email);
    }, [email, onEmailSuccess]);

    const handleCodeCancel = React.useCallback(() => {
      setAuthState("initial");
      setEmail("");
    }, []);

    return (
      <Wrapper>
        {authState === "code" ? (
          <Form method="POST" action="/auth/email.callback">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="client" value={clientType} />
            <input type="hidden" name="follow" value="true" />
            <OneTimePasswordInput name="code" autoSubmit />
          </Form>
        ) : (
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
              <ButtonLarge
                type="submit"
                icon={<EmailIcon />}
                fullwidth
                {...rest}
              >
                {t("Continue with Email")}
              </ButtonLarge>
            )}
          </Form>
        )}
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
