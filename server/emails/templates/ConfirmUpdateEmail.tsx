import * as React from "react";
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
  code: string;
  previous: string | null;
  teamUrl: string;
};

/**
 * Email sent to a user when they request to change their email.
 */
export default class ConfirmUpdateEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Authentication;
  }

  protected subject() {
    return this.t("Your email update request");
  }

  protected preview() {
    return this.t("Here’s your email change confirmation.");
  }

  protected renderAsText({ teamUrl, code, previous, to }: Props): string {
    return `
${
  previous
    ? this.t(
        "You requested to update your {{ appName }} account email. Please follow the link below to confirm the change from {{ previous }} to {{ to }}.",
        { appName: env.APP_NAME, previous, to }
      )
    : this.t(
        "You requested to update your {{ appName }} account email. Please follow the link below to confirm the change to {{ to }}.",
        { appName: env.APP_NAME, to }
      )
}

  ${this.updateLink(teamUrl, code)}
  `;
  }

  protected render({ teamUrl, code, previous, to }: Props) {
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>{this.t("Your email update request")}</Heading>
          <p>
            {previous
              ? this.t(
                  "You requested to update your {{ appName }} account email. Please click below to confirm the change from {{ previous }} to",
                  { appName: env.APP_NAME, previous }
                )
              : this.t(
                  "You requested to update your {{ appName }} account email. Please click below to confirm the change to",
                  { appName: env.APP_NAME }
                )}{" "}
            <strong>{to}</strong>.
          </p>
          <EmptySpace height={5} />
          <p>
            <Button href={this.updateLink(teamUrl, code)}>
              {this.t("Confirm Change")}
            </Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }

  private updateLink(teamUrl: string, code: string): string {
    return `${teamUrl}/api/users.updateEmail?code=${code}`;
  }
}
