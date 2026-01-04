import env from "@server/env";
import type { EmailProps } from "@server/emails/templates/BaseEmail";
import BaseEmail, {
  EmailMessageCategory,
} from "@server/emails/templates/BaseEmail";
import Body from "@server/emails/templates/components/Body";
import Button from "@server/emails/templates/components/Button";
import EmailTemplate from "@server/emails/templates/components/EmailLayout";
import EmptySpace from "@server/emails/templates/components/EmptySpace";
import Footer from "@server/emails/templates/components/Footer";
import Header from "@server/emails/templates/components/Header";
import Heading from "@server/emails/templates/components/Heading";

type InputProps = EmailProps & {
  userId: string;
  passkeyId: string;
  passkeyName: string;
  teamUrl: string;
};

type Props = InputProps;

/**
 * Email sent to a user when a new passkey is created on their account.
 */
export class PasskeyCreatedEmail extends BaseEmail<InputProps> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected subject() {
    return `New passkey added to your ${env.APP_NAME} account`;
  }

  protected preview() {
    return "A new passkey was created for your account.";
  }

  protected renderAsText({ passkeyName, teamUrl }: Props) {
    return `
New Passkey Created

A new passkey has been added to your ${env.APP_NAME} account:

${passkeyName}

Passkeys provide a secure, passwordless way to sign in to your account. If you did not create this passkey, please review your account security settings immediately.

You can manage your passkeys at any time:
${teamUrl}/settings/passkeys

---

If you have any concerns about your account security, please contact a workspace admin.
`;
  }

  protected render({ passkeyName, teamUrl }: Props) {
    const securityUrl = `${teamUrl}/settings/passkeys`;

    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>New Passkey Created</Heading>
          <p>A new passkey has been added to your {env.APP_NAME} account:</p>
          <p>
            <strong>{passkeyName}</strong>
          </p>
          <p>
            Passkeys provide a secure, passwordless way to sign in to your
            account. If you did not create this passkey, please review your
            account security settings immediately.
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={securityUrl}>Manage Passkeys</Button>
          </p>
          <EmptySpace height={10} />
          <p style={{ fontSize: "14px", color: "#666" }}>
            If you have any concerns about your account security, please contact
            a workspace admin.
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }
}
