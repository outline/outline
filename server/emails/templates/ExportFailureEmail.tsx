import * as React from "react";
import { NotificationEventType } from "@shared/types";
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
  teamUrl: string;
  teamId: string;
};

type BeforeSendProps = {
  unsubscribeUrl: string;
};

/**
 * Email sent to a user when their data export has failed for some reason.
 */
export default class ExportFailureEmail extends BaseEmail<
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
    return "Sorry, your requested data export has failed";
  }

  protected renderAsText() {
    return `
Your Data Export

Sorry, your requested data export has failed, please visit the admin
section to try again – if the problem persists please contact support.
`;
  }

  protected render({ teamUrl, unsubscribeUrl }: Props & BeforeSendProps) {
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
