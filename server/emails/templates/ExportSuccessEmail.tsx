import * as React from "react";
import { NotificationEventType } from "@shared/types";
import env from "@server/env";
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
  id: string;
  teamUrl: string;
  teamId: string;
};

type BeforeSend = {
  unsubscribeUrl: string;
};

type Props = BeforeSend & InputProps;

/**
 * Email sent to a user when their data export has completed and is available
 * for download in the settings section.
 */
export default class ExportSuccessEmail extends BaseEmail<
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
    return `Here's your request data export from ${env.APP_NAME}`;
  }

  protected renderAsText() {
    return `
Your Data Export

Your requested data export is complete, the exported files are also available in the admin section.
`;
  }

  protected render({ id, teamUrl, unsubscribeUrl }: Props) {
    const downloadLink = `${teamUrl}/api/fileOperations.redirect?id=${id}`;

    return (
      <EmailTemplate
        previewText={this.preview()}
        goToAction={{ url: downloadLink, name: "Download export" }}
      >
        <Header />

        <Body>
          <Heading>Your Data Export</Heading>
          <p>
            Your requested data export is complete, the exported files are also
            available in the{" "}
            <a
              href={`${teamUrl}/settings/export`}
              rel="noreferrer"
              target="_blank"
            >
              admin section
            </a>
            .
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={downloadLink}>Download</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
