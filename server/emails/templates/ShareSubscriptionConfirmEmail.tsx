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
  /**
   * What the subscription notifies about — defaults to document update
   * notifications, matching the standalone subscribe flow. Guests who leave
   * their email while commenting are subscribed for comment notifications
   * instead, which reads more naturally as "comments" here.
   */
  reason?: "updates" | "comments";
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

  protected preview({ documentTitle, reason }: Props) {
    return reason === "comments"
      ? this.t(
          'Confirm your subscription to receive replies to your comments on "{{ documentTitle }}".',
          { documentTitle }
        )
      : this.t(
          'Confirm your subscription to receive updates when "{{ documentTitle }}" changes.',
          { documentTitle }
        );
  }

  protected renderAsText({
    documentTitle,
    confirmUrl,
    teamName,
    reason,
  }: Props): string {
    const appName = teamName ?? env.APP_NAME;
    const body =
      reason === "comments"
        ? this.t(
            'You requested to receive email notifications about new comments on "{{ documentTitle }}" on {{ appName }}. Please confirm your subscription by following the link below.',
            { documentTitle, appName }
          )
        : this.t(
            'You requested to receive email notifications when "{{ documentTitle }}" is updated on {{ appName }}. Please confirm your subscription by following the link below.',
            { documentTitle, appName }
          );
    return `
${this.t("Confirm your subscription")}

${body}

${this.t("Confirm Subscription")}: ${confirmUrl}

${this.t("This link will expire in 24 hours.")}
`;
  }

  protected render({ documentTitle, confirmUrl, teamName, reason }: Props) {
    const appName = teamName ?? env.APP_NAME;
    return (
      <EmailTemplate
        previewText={this.preview({ documentTitle, reason } as Props)}
      >
        <Header />

        <Body>
          <Heading>{this.t("Confirm your subscription")}</Heading>
          <p>
            {reason === "comments"
              ? this.t(
                  'You requested to receive email notifications about new comments on "{{ documentTitle }}" on {{ appName }}.',
                  { documentTitle, appName }
                )
              : this.t(
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
