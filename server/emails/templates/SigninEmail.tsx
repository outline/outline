import type { Client } from "@shared/types";
import env from "@server/env";
import logger from "@server/logging/Logger";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
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
    return token
      ? this.t("Magic signin link")
      : this.t("Sign in verification code");
  }

  protected preview(): string {
    return this.t("Here’s your link to signin to {{ appName }}.", {
      appName: env.APP_NAME,
    });
  }

  protected renderAsText({
    token,
    teamUrl,
    client,
    verificationCode,
  }: Props): string {
    if (token) {
      return `
${this.t("Use the link below to sign in")}:

${this.signinLink(teamUrl, token, client)}

${this.t("If the link expired you can request a new one from your team's signin page at")}: ${teamUrl}
`;
    }

    return `
${this.t("Enter this verification code")}: ${verificationCode}

${this.t("If the code expired you can request a new one from your team's signin page at")}: ${teamUrl}
`;
  }

  protected render({ token, client, teamUrl, verificationCode }: Props) {
    if (env.isDevelopment) {
      if (token) {
        logger.debug(
          "email",
          `Sign-In link: ${this.signinLink(teamUrl, token, client)}`
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
            ? {
                url: this.signinLink(teamUrl, token, client),
                name: this.t("Sign In"),
              }
            : undefined
        }
      >
        <Header />

        {token ? (
          <Body>
            <Heading>{this.t("Magic Sign-in Link")}</Heading>
            <p>
              {this.t("Click the button below to sign in to {{ appName }}.", {
                appName: env.APP_NAME,
              })}
            </p>
            <EmptySpace height={10} />
            <p>
              <Button href={this.signinLink(teamUrl, token, client)}>
                {this.t("Sign In")}
              </Button>
            </p>
            <EmptySpace height={20} />
            <p>
              {this.t(
                "If the link expired you can request a new one from your team's sign-in page at"
              )}
              : <a href={teamUrl}>{teamUrl}</a>
            </p>
          </Body>
        ) : (
          <Body>
            <Heading>{this.t("Sign-in Code")}</Heading>
            <p>
              {this.t(
                "Enter this code on your team's sign-in page to continue."
              )}
            </p>
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
              {this.t(
                "If the code expired you can request a new one from your team's sign-in page at"
              )}
              : <a href={teamUrl}>{teamUrl}</a>
            </p>
          </Body>
        )}
        <Footer />
      </EmailTemplate>
    );
  }

  private signinLink(teamUrl: string, token: string, client: Client): string {
    return `${teamUrl}/auth/email.callback?token=${token}&client=${client}`;
  }
}
