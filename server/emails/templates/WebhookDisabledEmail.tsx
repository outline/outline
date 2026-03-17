import * as React from "react";
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
  teamUrl: string;
  webhookName: string;
};

/**
 * Email sent to the creator of a webhook when the webhook has become disabled
 * due to repeated failure.
 */
export default class WebhookDisabledEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected subject() {
    return this.t("Warning") + ": " + this.t("Webhook disabled");
  }

  protected preview({ webhookName }: Props) {
    return this.t("Your webhook ({{ webhookName }}) has been disabled", {
      webhookName,
    });
  }

  protected renderAsText({ webhookName, teamUrl }: Props): string {
    return `
${this.t("Your webhook ({{ webhookName }}) has been automatically disabled due to a high failure rate in recent delivery attempts. You can re-enable by editing the webhook.", { webhookName })}

${this.t("Webhook settings")}: ${teamUrl}/settings/webhooks
`;
  }

  protected render(props: Props) {
    const { webhookName, teamUrl } = props;
    const webhookSettingsLink = `${teamUrl}/settings/webhooks`;

    return (
      <EmailTemplate previewText={this.preview(props)}>
        <Header />

        <Body>
          <Heading>{this.t("Webhook disabled")}</Heading>
          <p>
            {this.t(
              "Your webhook ({{ webhookName }}) has been automatically disabled due to a high failure rate in recent delivery attempts. You can re-enable by editing the webhook.",
              { webhookName }
            )}
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={webhookSettingsLink}>
              {this.t("Webhook settings")}
            </Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
