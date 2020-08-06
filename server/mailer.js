// @flow
import * as React from "react";
import debug from "debug";
import * as Sentry from "@sentry/node";
import nodemailer from "nodemailer";
import Oy from "oy-vey";
import { createQueue } from "./utils/queue";
import { baseStyles } from "./emails/components/EmailLayout";
import { WelcomeEmail, welcomeEmailText } from "./emails/WelcomeEmail";
import { ExportEmail, exportEmailText } from "./emails/ExportEmail";
import { SigninEmail, signinEmailText } from "./emails/SigninEmail";
import {
  type Props as InviteEmailT,
  InviteEmail,
  inviteEmailText,
} from "./emails/InviteEmail";
import {
  type Props as DocumentNotificationEmailT,
  DocumentNotificationEmail,
  documentNotificationEmailText,
} from "./emails/DocumentNotificationEmail";
import {
  type Props as CollectionNotificationEmailT,
  CollectionNotificationEmail,
  collectionNotificationEmailText,
} from "./emails/CollectionNotificationEmail";

const log = debug("emails");

type Emails = "welcome" | "export";

type SendMailType = {
  to: string,
  properties?: any,
  title: string,
  previewText?: string,
  text: string,
  html: React.Node,
  headCSS?: string,
  attachments?: Object[],
};

type EmailJob = {
  data: {
    type: Emails,
    opts: SendMailType,
  },
};

/**
 * Mailer
 *
 * Mailer class to contruct and send emails.
 *
 * To preview emails, add a new preview to `emails/index.js` if they
 * require additional data (properties). Otherwise preview will work automatically.
 *
 * HTML: http://localhost:3000/email/:email_type/html
 * TEXT: http://localhost:3000/email/:email_type/text
 */
export class Mailer {
  transporter: ?any;

  sendMail = async (data: SendMailType): ?Promise<*> => {
    const { transporter } = this;

    if (transporter) {
      const html = Oy.renderTemplate(data.html, {
        title: data.title,
        headCSS: [baseStyles, data.headCSS].join(" "),
        previewText: data.previewText,
      });

      try {
        log(`Sending email "${data.title}" to ${data.to}`);
        await transporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL,
          replyTo: process.env.SMTP_REPLY_EMAIL || process.env.SMTP_FROM_EMAIL,
          to: data.to,
          subject: data.title,
          html: html,
          text: data.text,
          attachments: data.attachments,
        });
      } catch (err) {
        if (process.env.SENTRY_DSN) {
          Sentry.captureException(err);
        }
        throw err; // Re-throw for queue to re-try
      }
    }
  };

  welcome = async (opts: { to: string, teamUrl: string }) => {
    this.sendMail({
      to: opts.to,
      title: "Welcome to Outline",
      previewText:
        "Outline is a place for your team to build and share knowledge.",
      html: <WelcomeEmail {...opts} />,
      text: welcomeEmailText(opts),
    });
  };

  export = async (opts: { to: string, attachments: Object[] }) => {
    this.sendMail({
      to: opts.to,
      attachments: opts.attachments,
      title: "Your requested export",
      previewText: "Here's your request data export from Outline",
      html: <ExportEmail />,
      text: exportEmailText,
    });
  };

  invite = async (opts: { to: string } & InviteEmailT) => {
    this.sendMail({
      to: opts.to,
      title: `${opts.actorName} invited you to join ${
        opts.teamName
      }’s knowledge base`,
      previewText:
        "Outline is a place for your team to build and share knowledge.",
      html: <InviteEmail {...opts} />,
      text: inviteEmailText(opts),
    });
  };

  signin = async (opts: { to: string, token: string, teamUrl: string }) => {
    this.sendMail({
      to: opts.to,
      title: "Magic signin link",
      previewText: "Here’s your link to signin to Outline.",
      html: <SigninEmail {...opts} />,
      text: signinEmailText(opts),
    });
  };

  documentNotification = async (
    opts: { to: string } & DocumentNotificationEmailT
  ) => {
    this.sendMail({
      to: opts.to,
      title: `“${opts.document.title}” ${opts.eventName}`,
      previewText: `${opts.actor.name} ${opts.eventName} a new document`,
      html: <DocumentNotificationEmail {...opts} />,
      text: documentNotificationEmailText(opts),
    });
  };

  collectionNotification = async (
    opts: { to: string } & CollectionNotificationEmailT
  ) => {
    this.sendMail({
      to: opts.to,
      title: `“${opts.collection.name}” ${opts.eventName}`,
      previewText: `${opts.actor.name} ${opts.eventName} a collection`,
      html: <CollectionNotificationEmail {...opts} />,
      text: collectionNotificationEmailText(opts),
    });
  };

  constructor() {
    if (process.env.SMTP_HOST) {
      let smtpConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.NODE_ENV === "production",
        auth: undefined,
      };

      if (process.env.SMTP_USERNAME) {
        smtpConfig.auth = {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        };
      }

      this.transporter = nodemailer.createTransport(smtpConfig);
    }
  }
}

const mailer = new Mailer();
export default mailer;

export const mailerQueue = createQueue("email");

mailerQueue.process(async (job: EmailJob) => {
  // $FlowIssue flow doesn't like dynamic values
  await mailer[job.data.type](job.data.opts);
});

export const sendEmail = (type: Emails, to: string, options?: Object = {}) => {
  mailerQueue.add(
    {
      type,
      opts: {
        to,
        ...options,
      },
    },
    {
      attempts: 5,
      removeOnComplete: true,
      backoff: {
        type: "exponential",
        delay: 60 * 1000,
      },
    }
  );
};
