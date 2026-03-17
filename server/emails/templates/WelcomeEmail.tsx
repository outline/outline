import * as React from "react";
import { UserRole } from "@shared/types";
import env from "@server/env";
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
  role: UserRole;
  teamUrl: string;
};

type BeforeSend = Record<string, never>;

/**
 * Email sent to a user when their account has just been created, or they signed
 * in for the first time from an invite.
 */
export default class WelcomeEmail extends BaseEmail<Props, BeforeSend> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected subject() {
    return this.t("Welcome to {{ appName }}!", { appName: env.APP_NAME });
  }

  protected async beforeSend(props: Props) {
    if (props.role === UserRole.Guest) {
      return false;
    }
    return {};
  }

  protected preview() {
    return this.t(
      "{{ appName }} is a place for your team to build and share knowledge.",
      { appName: env.APP_NAME }
    );
  }

  protected renderAsText({ teamUrl }: Props) {
    return `
${this.t("Welcome to {{ appName }}!", { appName: env.APP_NAME })}

${this.t("{{ appName }} is a place for your team to build and share knowledge.", { appName: env.APP_NAME })}

${this.t("To get started, head to the home screen and try creating a collection to help document your processes, create playbooks, or plan your team's work.")}

${this.t("Or, learn more about everything {{ appName }} can do in the guide", { appName: env.APP_NAME })}:
https://docs.getoutline.com/s/guide

${teamUrl}/home
`;
  }

  protected render({ teamUrl }: Props) {
    const welcomeLink = `${teamUrl}/home?ref=welcome-email`;

    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>
            {this.t("Welcome to {{ appName }}!", { appName: env.APP_NAME })}
          </Heading>
          <p>
            {this.t(
              "{{ appName }} is a place for your team to build and share knowledge.",
              { appName: env.APP_NAME }
            )}
          </p>
          <p>
            {this.t(
              "To get started, head to the home screen and try creating a collection to help document your processes, create playbooks, or plan your team's work."
            )}
          </p>
          <p>
            {this.t("Or, learn more about everything {{ appName }} can do in", {
              appName: env.APP_NAME,
            })}{" "}
            <a href="https://docs.getoutline.com/s/guide">
              {this.t("the guide")}
            </a>
            .
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={welcomeLink}>
              {this.t("Open {{ appName }}", { appName: env.APP_NAME })}
            </Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
