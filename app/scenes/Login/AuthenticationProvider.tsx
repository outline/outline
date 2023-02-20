import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Client } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import ButtonLarge from "~/components/ButtonLarge";
import InputLarge from "~/components/InputLarge";
import PluginIcon from "~/components/PluginIcon";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import Desktop from "~/utils/Desktop";

type Props = {
  id: string;
  name: string;
  authUrl: string;
  isCreate: boolean;
  onEmailSuccess: (email: string) => void;
};

function useRedirectHref(authUrl: string) {
  // If we're on a custom domain or a subdomain then the auth must point to the
  // apex (env.URL) for authentication so that the state cookie can be set and read.
  // We pass the host into the auth URL so that the server can redirect on error
  // and keep the user on the same page.
  const { custom, teamSubdomain, host } = parseDomain(window.location.origin);
  const url = new URL(env.URL);
  url.pathname = authUrl;

  if (custom || teamSubdomain) {
    url.searchParams.set("host", host);
  }
  if (Desktop.isElectron()) {
    url.searchParams.set("client", Client.Desktop);
  }

  return url.toString();
}

function AuthenticationProvider(props: Props) {
  const { t } = useTranslation();
  const [showEmailSignin, setShowEmailSignin] = React.useState(false);
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const { isCreate, id, name, authUrl } = props;

  const handleChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleSubmitEmail = async (
    event: React.SyntheticEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (showEmailSignin && email) {
      setSubmitting(true);

      try {
        const response = await client.post(event.currentTarget.action, {
          email,
          client: Desktop.isElectron() ? "desktop" : undefined,
        });

        if (response.redirect) {
          window.location.href = response.redirect;
        } else {
          props.onEmailSuccess(email);
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      setShowEmailSignin(true);
    }
  };

  const href = useRedirectHref(authUrl);

  if (id === "email") {
    if (isCreate) {
      return null;
    }

    return (
      <Wrapper>
        <Form method="POST" action="/auth/email" onSubmit={handleSubmitEmail}>
          {showEmailSignin ? (
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
              <ButtonLarge type="submit" disabled={isSubmitting}>
                {t("Sign In")} →
              </ButtonLarge>
            </>
          ) : (
            <ButtonLarge type="submit" icon={<EmailIcon />} fullwidth>
              {t("Continue with Email")}
            </ButtonLarge>
          )}
        </Form>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <ButtonLarge
        onClick={() => (window.location.href = href)}
        icon={<PluginIcon id={id} />}
        fullwidth
      >
        {t("Continue with {{ authProviderName }}", {
          authProviderName: name,
        })}
      </ButtonLarge>
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

export default AuthenticationProvider;
