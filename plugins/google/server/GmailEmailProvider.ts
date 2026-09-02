import addressparser from "addressparser";
import JWT from "jsonwebtoken";
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
import Logger from "@server/logging/Logger";
import { decodePem } from "@server/utils/crypto";
import fetch from "@server/utils/fetch";
import env from "./env";

const TokenEndpoint = "https://oauth2.googleapis.com/token";
const SendEndpoint =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const SendScope = "https://www.googleapis.com/auth/gmail.send";

/**
 * Delivers email through the Gmail API, authenticating as a service account
 * that has been granted domain-wide delegation.
 *
 * Google Workspace has removed password-based SMTP for accounts with two-step
 * verification or advanced protection enabled, leaving app passwords as the only
 * SMTP option. This sends over an API instead, with no mailbox password and no
 * per-user credential to rotate.
 *
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
 */
export class GmailEmailProvider extends BaseEmailProvider {
  id = "gmail";

  name = "Gmail";

  // Gmail resolves Bcc recipients from the message headers and strips them
  // before delivery, so the header must survive into the MIME output.
  protected keepBcc = true;

  protected async sendMessage(
    mail: MailMessage<SentMessageInfo>
  ): Promise<void> {
    const from = mail.message.getEnvelope().from;

    // The mailbox to impersonate is resolved from configuration rather than
    // the message, because the message's own from address can vary per
    // message – it is randomized for authentication emails on cloud-hosted
    // installations – and each distinct mailbox costs a token exchange.
    const mailbox =
      env.GOOGLE_MAIL_FROM_USER_ID ||
      (env.SMTP_FROM_EMAIL
        ? addressparser(env.SMTP_FROM_EMAIL)[0]?.address
        : undefined) ||
      from;

    if (!mailbox) {
      throw InternalError(
        "A sender mailbox is required to send email with Gmail – set SMTP_FROM_EMAIL"
      );
    }

    // Gmail rewrites the From header to the impersonated mailbox unless the
    // From address is one of that mailbox's send-as aliases, so a divergence
    // between the two is worth a warning – it cannot be detected here.
    if (!this.warnedFromMismatch && from && from !== mailbox) {
      this.warnedFromMismatch = true;
      Logger.warn(
        `Gmail rewrites the From header to ${mailbox} unless ${from} is configured as a send-as alias of that mailbox`
      );
    }

    const message = await this.getMimeMessage(mail);
    // The mailbox is identified by the token's subject, so addressing "me"
    // cannot disagree with the account being impersonated.
    const accessToken = await this.tokens.get(mailbox);

    const response = await fetch(SendEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      // Gmail expects the message web-safe encoded rather than as standard
      // base64, so that it survives being carried in a JSON string.
      body: JSON.stringify({ raw: message.toString("base64url") }),
    });

    await this.assertOk(response, "Gmail could not send the message");
  }

  private requestAccessToken = async (
    mailbox: string
  ): Promise<AccessToken> => {
    const privateKey = this.getPrivateKey();

    if (!privateKey || !env.GOOGLE_MAIL_CLIENT_EMAIL) {
      throw InternalError(
        "GOOGLE_MAIL_CLIENT_EMAIL and GOOGLE_MAIL_PRIVATE_KEY are required to send email with Gmail. This requires a Google Workspace service account with domain-wide delegation, and cannot be used with a personal Gmail account."
      );
    }

    // Domain-wide delegation is requested by signing an assertion that names
    // the mailbox to impersonate as its subject.
    const assertion = JWT.sign({ scope: SendScope }, privateKey, {
      algorithm: "RS256",
      issuer: env.GOOGLE_MAIL_CLIENT_EMAIL,
      subject: mailbox,
      audience: TokenEndpoint,
      expiresIn: "1h",
    });

    return fetchAccessToken(
      TokenEndpoint,
      {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      },
      `Google rejected the service account assertion for ${mailbox}`
    );
  };

  private getPrivateKey(): string | undefined {
    const key = env.GOOGLE_MAIL_PRIVATE_KEY;
    return key ? decodePem(key) : undefined;
  }

  private tokens = new AccessTokenCache(this.requestAccessToken);

  private warnedFromMismatch = false;
}
