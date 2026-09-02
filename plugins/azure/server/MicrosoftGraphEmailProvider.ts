import addressparser from "addressparser";
import type MailMessage from "nodemailer/lib/mailer/mail-message";
import {
  type AccessToken,
  AccessTokenCache,
  fetchAccessToken,
} from "@server/emails/providers/AccessTokenCache";
import {
  BaseEmailProvider,
  type SentMessageInfo,
} from "@server/emails/providers/BaseEmailProvider";
import { InternalError } from "@server/errors";
import fetch from "@server/utils/fetch";
import env from "./env";

/**
 * Delivers email through the Microsoft Graph API, authenticating with the OAuth
 * client credentials flow.
 *
 * Microsoft 365 tenants increasingly have SMTP AUTH disabled, as it requires
 * legacy authentication that conflicts with Conditional Access policies. Graph
 * needs no mailbox password and works with those policies in place.
 *
 * Messages are handed over as MIME rather than as a Graph `message` resource,
 * because Graph only accepts a restricted set of custom headers in the JSON
 * form – threading and unsubscribe headers would be dropped.
 *
 * Note that Graph saves MIME sends to the sending mailbox's Sent Items folder,
 * and offers no way to opt out.
 *
 * @see https://learn.microsoft.com/en-us/graph/api/user-sendmail
 */
export class MicrosoftGraphEmailProvider extends BaseEmailProvider {
  id = "msgraph";

  name = "Microsoft Graph";

  // Graph resolves Bcc recipients from the message headers and strips them
  // before delivery, so the header must survive into the MIME output.
  protected keepBcc = true;

  protected async sendMessage(
    mail: MailMessage<SentMessageInfo>
  ): Promise<void> {
    // Graph identifies the sending mailbox in the path. It is resolved from
    // configuration rather than the message, because the message's own from
    // address can vary per message – it is randomized for authentication
    // emails on cloud-hosted installations.
    const mailbox =
      env.AZURE_MAIL_FROM_USER_ID ||
      (env.SMTP_FROM_EMAIL
        ? addressparser(env.SMTP_FROM_EMAIL)[0]?.address
        : undefined) ||
      mail.message.getEnvelope().from;

    if (!mailbox) {
      throw InternalError(
        "A sender mailbox is required to send email with Microsoft Graph – set SMTP_FROM_EMAIL"
      );
    }

    const message = await this.getMimeMessage(mail);
    const accessToken = await this.tokens.get(
      env.AZURE_MAIL_TENANT_ID ?? "common"
    );

    const response = await fetch(
      `${env.AZURE_MAIL_GRAPH_BASE_URL}/v1.0/users/${encodeURIComponent(
        mailbox
      )}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Signals that the body is a base64-encoded MIME message rather than
          // a JSON message resource.
          "Content-Type": "text/plain",
        },
        body: message.toString("base64"),
      }
    );

    // A successful send is acknowledged with 202 Accepted and an empty body.
    await this.assertOk(response, "Microsoft Graph could not send the message");
  }

  private requestAccessToken = (tenantId: string): Promise<AccessToken> =>
    fetchAccessToken(
      `${env.AZURE_MAIL_AUTHORITY_URL}/${tenantId}/oauth2/v2.0/token`,
      {
        client_id: env.AZURE_MAIL_CLIENT_ID ?? "",
        client_secret: env.AZURE_MAIL_CLIENT_SECRET ?? "",
        grant_type: "client_credentials",
        scope: `${env.AZURE_MAIL_GRAPH_BASE_URL}/.default`,
      },
      "Microsoft Graph rejected the credentials in AZURE_MAIL_CLIENT_ID and AZURE_MAIL_CLIENT_SECRET"
    );

  private tokens = new AccessTokenCache(this.requestAccessToken);
}
