import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import AuthLogo from "~/components/AuthLogo";
import ButtonLarge from "~/components/ButtonLarge";
import InputLarge from "~/components/InputLarge";
import { client } from "~/utils/ApiClient";

type Props = {
  id: string;
  name: string;
  authUrl: string;
  isCreate: boolean;
  onEmailSuccess: (email: string) => void;
};

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
        onClick={() => (window.location.href = authUrl)}
        icon={<AuthLogo providerName={id} />}
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
