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
  documentTitle: string;
  confirmUrl: string;
  teamName?: string;
};

/**
 * Email sent to confirm a share subscription request.
 */
export default class ShareSubscriptionConfirmEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Authentication;
  }

  protected subject() {
    return this.t("Confirm your subscription");
  }

  protected preview({ documentTitle }: Props) {
    return this.t(
      'Confirm your subscription to receive updates when "{{ documentTitle }}" changes.',
      { documentTitle }
    );
  }

  protected renderAsText({
    documentTitle,
    confirmUrl,
    teamName,
  }: Props): string {
    const appName = teamName ?? env.APP_NAME;
    return `
${this.t("Confirm your subscription")}

${this.t(
  'You requested to receive email notifications when "{{ documentTitle }}" is updated on {{ appName }}. Please confirm your subscription by following the link below.',
  { documentTitle, appName }
)}

${this.t("Confirm Subscription")}: ${confirmUrl}

${this.t("This link will expire in 24 hours.")}
`;
  }

  protected render({ documentTitle, confirmUrl, teamName }: Props) {
    const appName = teamName ?? env.APP_NAME;
    return (
      <EmailTemplate previewText={this.preview({ documentTitle } as Props)}>
        <Header />

        <Body>
          <Heading>{this.t("Confirm your subscription")}</Heading>
          <p>
            {this.t(
              'You requested to receive email notifications when "{{ documentTitle }}" is updated on {{ appName }}.',
              { documentTitle, appName }
            )}
          </p>
          <p>
            {this.t(
              "Please confirm your subscription by clicking the button below."
            )}
          </p>
          <EmptySpace height={5} />
          <p>
            <Button href={confirmUrl}>{this.t("Confirm Subscription")}</Button>
          </p>
          <EmptySpace height={5} />
          <p>
            <em>{this.t("This link will expire in 24 hours.")}</em>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
