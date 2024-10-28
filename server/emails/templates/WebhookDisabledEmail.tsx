import * as React from "react";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
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
    return `Warning: Webhook disabled`;
  }

  protected preview({ webhookName }: Props) {
    return `Your webhook (${webhookName}) has been disabled`;
  }

  protected renderAsText({ webhookName, teamUrl }: Props): string {
    return `
Your webhook (${webhookName}) has been automatically disabled as the last 25
delivery attempts have failed. You can re-enable by editing the webhook.

Webhook settings: ${teamUrl}/settings/webhooks
`;
  }

  protected render(props: Props) {
    const { webhookName, teamUrl } = props;
    const webhookSettingsLink = `${teamUrl}/settings/webhooks`;

    return (
      <EmailTemplate previewText={this.preview(props)}>
        <Header />

        <Body>
          <Heading>Webhook disabled</Heading>
          <p>
            Your webhook ({webhookName}) has been automatically disabled as the
            last 25 delivery attempts have failed. You can re-enable by editing
            the webhook.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={webhookSettingsLink}>Webhook settings</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
