import * as React from "react";
import { NotificationEventType } from "@shared/types";
import env from "@server/env";
import { User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  userId: string;
  id: string;
  teamUrl: string;
  teamId: string;
};

type BeforeSendProps = {
  unsubscribeUrl: string;
};

/**
 * Email sent to a user when their data export has completed and is available
 * for download in the settings section.
 */
export default class ExportSuccessEmail extends BaseEmail<
  Props,
  BeforeSendProps
> {
  protected async beforeSend({ userId }: Props) {
    return {
      unsubscribeUrl: NotificationSettingsHelper.unsubscribeUrl(
        await User.findByPk(userId, { rejectOnEmpty: true }),
        NotificationEventType.ExportCompleted
      ),
    };
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

  protected render({ id, teamUrl, unsubscribeUrl }: Props & BeforeSendProps) {
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
