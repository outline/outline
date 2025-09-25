import { Client } from "@shared/types";
import env from "@server/env";
import logger from "@server/logging/Logger";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  token?: string;
  teamUrl: string;
  client: Client;
  verificationCode?: string;
};

/**
 * Email sent to a user when they request a magic sign-in link.
 */
export default class SigninEmail extends BaseEmail<Props, void> {
  protected get category() {
    return EmailMessageCategory.Authentication;
  }

  protected subject({ token }: Props) {
    return token ? "Magic signin link" : "Sign in verification code";
  }

  protected preview(): string {
    return `Here’s your link to signin to ${env.APP_NAME}.`;
  }

  protected renderAsText({
    token,
    teamUrl,
    client,
    verificationCode,
  }: Props): string {
    if (token) {
      return `
Use the link below to sign in:

${this.signinLink(token, client)}

If the link expired you can request a new one from your team's
signin page at: ${teamUrl}
`;
    }

    return `
Enter this verification code: ${verificationCode}

If the code expired you can request a new one from your team's
signin page at: ${teamUrl}
`;
  }

  protected render({ token, client, teamUrl, verificationCode }: Props) {
    if (env.isDevelopment) {
      if (token) {
        logger.debug(
          "email",
          `Sign-In link: ${this.signinLink(token, client)}`
        );
      }
      if (verificationCode) {
        logger.debug("email", `Verification code: ${verificationCode}`);
      }
    }

    return (
      <EmailTemplate
        previewText={this.preview()}
        goToAction={
          token
            ? { url: this.signinLink(token, client), name: "Sign In" }
            : undefined
        }
      >
        <Header />

        {token ? (
          <Body>
            <Heading>Magic Sign-in Link</Heading>
            <p>Click the button below to sign in to {env.APP_NAME}.</p>
            <EmptySpace height={10} />
            <p>
              <Button href={this.signinLink(token, client)}>Sign In</Button>
            </p>
            <EmptySpace height={20} />
            <p>
              If the link expired you can request a new one from your team's
              sign-in page at: <a href={teamUrl}>{teamUrl}</a>
            </p>
          </Body>
        ) : (
          <Body>
            <Heading>Sign-in Code</Heading>
            <p>Enter this code on your team's sign-in page to continue.</p>
            <EmptySpace height={10} />
            <p
              style={{
                fontSize: "24px",
                letterSpacing: "0.25em",
                fontWeight: "bold",
                backgroundColor: "#F9FAFB",
                padding: "12px",
                borderRadius: "4px",
              }}
            >
              {verificationCode}
            </p>
            <EmptySpace height={20} />
            <p>
              If the code expired you can request a new one from your team's
              sign-in page at: <a href={teamUrl}>{teamUrl}</a>
            </p>
          </Body>
        )}
        <Footer />
      </EmailTemplate>
    );
  }

  private signinLink(token: string, client: Client): string {
    return `${env.URL}/auth/email.callback?token=${token}&client=${client}`;
  }
}
