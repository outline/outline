import * as React from "react";
import { NotificationEventType } from "@shared/types";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  teamUrl: string;
  teamId: string;
};

type BeforeSend = {
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when their data export has failed for some reason.
 */
export default class ExportFailureEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    return {
      unsubscribeUrl: this.unsubscribeUrl(props),
    };
  }

  protected unsubscribeUrl({ userId }: InputProps) {
    return NotificationSettingsHelper.unsubscribeUrl(
      userId,
      NotificationEventType.ExportCompleted
    );
  }

  protected subject() {
    return "Your requested export";
  }

  protected preview() {
    return "Sorry, your requested data export has failed";
  }

  protected renderAsText() {
    return `
Your Data Export

Sorry, your requested data export has failed, please visit the admin
section to try again – if the problem persists please contact support.
`;
  }

  protected render({ teamUrl, unsubscribeUrl }: Props) {
    const exportLink = `${teamUrl}/settings/export`;

    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />
        <Body>
          <Heading>Your Data Export</Heading>
          <p>
            Sorry, your requested data export has failed, please visit the{" "}
            <a href={exportLink} rel="noreferrer" target="_blank">
              admin section
            </a>
            . to try again – if the problem persists please contact support.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={exportLink}>Go to export</Button>
          </p>
        </Body>
        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
