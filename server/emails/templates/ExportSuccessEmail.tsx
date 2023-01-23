import * as React from "react";
import env from "@server/env";
import { NotificationSetting } from "@server/models";
import BaseEmail from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = {
  to: string;
  userId: string;
  id: string;
  teamUrl: string;
  teamId: string;
};

/**
 * Email sent to a user when their data export has completed and is available
 * for download in the settings section.
 */
export default class ExportSuccessEmail extends BaseEmail<Props> {
  protected async beforeSend({ userId, teamId }: Props) {
    const notificationSetting = await NotificationSetting.findOne({
      where: {
        userId,
        teamId,
        event: "emails.export_completed",
      },
    });

    return notificationSetting !== null;
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

  protected render({ id, teamUrl }: Props) {
    return (
      <EmailTemplate>
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
            <Button href={`${teamUrl}/api/fileOperations.redirect?id=${id}`}>
              Download
            </Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
