import * as React from "react";
import { UserRole } from "@shared/types";
import env from "@server/env";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
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
    return `Welcome to ${env.APP_NAME}`;
  }

  protected async beforeSend(props: Props) {
    if (props.role === UserRole.Guest) {
      return false;
    }
    return {};
  }

  protected preview() {
    return `${env.APP_NAME} is a place for your team to build and share knowledge.`;
  }

  protected renderAsText({ teamUrl }: Props) {
    return `
Welcome to ${env.APP_NAME}!

${env.APP_NAME} is a place for your team to build and share knowledge.

To get started, head to the home screen and try creating a collection to help document your processes, create playbooks, or plan your team's work.

Or, learn more about everything Outline can do in the guide:
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
          <Heading>Welcome to {env.APP_NAME}!</Heading>
          <p>
            {env.APP_NAME} is a place for your team to build and share
            knowledge.
          </p>
          <p>
            To get started, head to the home screen and try creating a
            collection to help document your processes, create playbooks, or
            plan your teams work.
          </p>
          <p>
            Or, learn more about everything Outline can do in{" "}
            <a href="https://docs.getoutline.com/s/guide">the guide</a>.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={welcomeLink}>Open {env.APP_NAME}</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
