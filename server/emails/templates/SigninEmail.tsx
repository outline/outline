import * as React from "react";
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
  token: string;
  teamUrl: string;
  client: Client;
};

/**
 * Email sent to a user when they request a magic sign-in link.
 */
export default class SigninEmail extends BaseEmail<Props, Record<string, any>> {
  protected get category() {
    return EmailMessageCategory.Authentication;
  }

  protected subject() {
    return "Magic signin link";
  }

  protected preview(): string {
    return `Here’s your link to signin to ${env.APP_NAME}.`;
  }

  protected renderAsText({ token, teamUrl, client }: Props): string {
    return `
Use the link below to signin to ${env.APP_NAME}:

${this.signinLink(token, client)}

If your magic link expired you can request a new one from your team’s
signin page at: ${teamUrl}
`;
  }

  protected render({ token, client, teamUrl }: Props) {
    if (env.isDevelopment) {
      logger.debug("email", `Sign-In link: ${this.signinLink(token, client)}`);
    }

    return (
      <EmailTemplate
        previewText={this.preview()}
        goToAction={{ url: this.signinLink(token, client), name: "Sign In" }}
      >
        <Header />

        <Body>
          <Heading>Magic Sign-in Link</Heading>
          <p>Click the button below to sign in to {env.APP_NAME}.</p>
          <EmptySpace height={10} />
          <p>
            <Button href={this.signinLink(token, client)}>Sign In</Button>
          </p>
          <EmptySpace height={10} />
          <p>
            If your magic link expired you can request a new one from your
            team’s sign-in page at: <a href={teamUrl}>{teamUrl}</a>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }

  private signinLink(token: string, client: Client): string {
    return `${env.URL}/auth/email.callback?token=${token}&client=${client}`;
  }
}
