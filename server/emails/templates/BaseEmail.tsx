import addressparser from "addressparser";
import Bull from "bull";
import invariant from "invariant";
import { Node } from "prosemirror-model";
import randomstring from "randomstring";
import * as React from "react";
import { TeamPreference } from "@shared/types";
import { Day } from "@shared/utils/time";
import mailer from "@server/emails/mailer";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import { Team } from "@server/models";
import Notification from "@server/models/Notification";
import HTMLHelper from "@server/models/helpers/HTMLHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";
import { taskQueue } from "@server/queues";
import { TaskPriority } from "@server/queues/tasks/BaseTask";
import { NotificationMetadata } from "@server/types";
import { getEmailMessageId } from "@server/utils/emails";

export enum EmailMessageCategory {
  Authentication = "authentication",
  Invitation = "invitation",
  Notification = "notification",
  Marketing = "marketing",
}

export interface EmailProps {
  /** The email address being sent to. */
  to: string | null;
  /** The notification that triggered the email, if any. */
  notification?: Notification;
}

export default abstract class BaseEmail<
  T extends EmailProps,
  S extends Record<string, any> | void = void
> {
  private props: T;
  private metadata?: NotificationMetadata;

  /** The message category for the email. */
  protected abstract get category(): EmailMessageCategory;

  /**
   * Schedule this email type to be sent asyncronously by a worker.
   *
   * @param options Options to pass to the Bull queue
   * @returns A promise that resolves once the email is placed on the task queue
   */
  public schedule(options?: Bull.JobOptions) {
    // No-op to schedule emails if SMTP is not configured
    if (!env.SMTP_FROM_EMAIL) {
      Logger.info(
        "email",
        `Email ${this.constructor.name} not sent due to missing SMTP configuration`
      );
      return;
    }

    const templateName = this.constructor.name;

    Metrics.increment("email.scheduled", {
      templateName,
    });

    // Ideally we'd use EmailTask.schedule here but importing creates a circular
    // dependency so we're pushing onto the task queue in the expected format
    return taskQueue.add(
      {
        name: "EmailTask",
        props: {
          templateName,
          ...this.metadata,
          props: this.props,
        },
      },
      {
        priority: TaskPriority.Normal,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 60 * 1000,
        },
        ...options,
      }
    );
  }

  constructor(props: T, metadata?: NotificationMetadata) {
    this.props = props;
    this.metadata = metadata;
  }

  /**
   * Send this email now.
   *
   * @returns A promise that resolves once the email has been successfully sent.
   */
  public async send() {
    const templateName = this.constructor.name;
    const bsResponse = await this.beforeSend?.(this.props);

    if (bsResponse === false) {
      Logger.info(
        "email",
        `Email ${templateName} not sent due to beforeSend hook`,
        this.props
      );
      return;
    }

    if (!this.props.to) {
      Logger.info(
        "email",
        `Email ${templateName} not sent due to missing email address`,
        this.props
      );
      return;
    }

    const notification = this.metadata?.notificationId
      ? await Notification.scope(["withActor", "withUser"]).findByPk(
          this.metadata?.notificationId
        )
      : undefined;
    const data = { ...this.props, notification, ...(bsResponse ?? ({} as S)) };

    if (notification?.viewedAt) {
      Logger.info(
        "email",
        `Email ${templateName} not sent as already viewed`,
        this.props
      );
      return;
    }

    const messageId = notification
      ? getEmailMessageId(notification.id)
      : undefined;

    const references = notification
      ? await Notification.emailReferences(notification)
      : undefined;

    try {
      await mailer.sendMail({
        to: this.props.to,
        replyTo: this.replyTo?.(data),
        from: this.from(data),
        subject: this.subject(data),
        messageId,
        references,
        previewText: this.preview(data),
        component: (
          <>
            {this.render(data)}
            {notification ? this.pixel(notification) : null}
          </>
        ),
        text: this.renderAsText(data),
        headCSS: this.headCSS?.(data),
        unsubscribeUrl: this.unsubscribeUrl?.(data),
      });
      Metrics.increment("email.sent", {
        templateName,
      });
    } catch (err) {
      Metrics.increment("email.sending_failed", {
        templateName,
      });
      throw err;
    }

    if (notification) {
      try {
        notification.emailedAt = new Date();
        await notification.save();
      } catch (err) {
        Logger.error(`Failed to update notification`, err, this.metadata);
      }
    }
  }

  private from(props: S & T) {
    invariant(
      env.SMTP_FROM_EMAIL,
      "SMTP_FROM_EMAIL is required to send emails"
    );

    const parsedFrom = addressparser(env.SMTP_FROM_EMAIL)[0];
    const name = this.fromName?.(props);

    if (this.category === EmailMessageCategory.Authentication) {
      const domain = parsedFrom.address.split("@")[1];
      return {
        name: name ?? parsedFrom.name,
        address: `noreply-${randomstring.generate(24)}@${domain}`,
      };
    }

    return {
      name: name ?? parsedFrom.name,
      address: parsedFrom.address,
    };
  }

  private pixel(notification: Notification) {
    return <img src={notification.pixelUrl} width="1" height="1" />;
  }

  /**
   * Returns the subject of the email.
   *
   * @param props Props in email constructor
   * @returns The email subject as a string
   */
  protected abstract subject(props: S & T): string;

  /**
   * Returns the preview text of the email, this is the text that will be shown
   * in email client list views.
   *
   * @param props Props in email constructor
   * @returns The preview text as a string
   */
  protected abstract preview(props: S & T): string;

  /**
   * Returns a plain-text version of the email, this is the text that will be
   * shown if the email client does not support or want HTML.
   *
   * @param props Props in email constructor
   * @returns The plain text email as a string
   */
  protected abstract renderAsText(props: S & T): string;

  /**
   * Returns a React element that will be rendered on the server to produce the
   * HTML version of the email.
   *
   * @param props Props in email constructor
   * @returns A JSX element
   */
  protected abstract render(props: S & T): JSX.Element;

  /**
   * Optionally returns a replyTo email to override the default.
   *
   * @param props Props in email constructor
   * @returns An email address
   */
  protected replyTo?(props: S & T): string | undefined;

  /**
   * Returns the unsubscribe URL for the email.
   *
   * @param props Props in email constructor
   * @returns The unsubscribe URL as a string
   */
  protected unsubscribeUrl?(props: T): string;

  /**
   * Allows injecting additional CSS into the head of the email.
   *
   * @param props Props in email constructor
   * @returns A string of CSS
   */
  protected headCSS?(props: T): string | undefined;

  /**
   * beforeSend hook allows async loading additional data that was not passed
   * through the serialized worker props. If false is returned then the email
   * send is aborted.
   *
   * @param props Props in email constructor
   * @returns A promise resolving to additional data
   */
  protected beforeSend?(props: T): Promise<S | false>;

  /**
   * fromName hook allows overriding the "from" name of the email.
   */
  protected fromName?(props: T): string | undefined;

  /**
   * A HTML string to be rendered in the email from a ProseMirror node. The string
   * will be inlined with CSS and have attachments converted to signed URLs.
   *
   * @param team The team the email is being sent to
   * @param node The prosemirror node to render
   * @returns The HTML content as a string, or undefined if team preference.
   */
  protected async htmlForData(team: Team, node: Node) {
    if (!team?.getPreference(TeamPreference.PreviewsInEmails)) {
      return undefined;
    }

    let content = ProsemirrorHelper.toHTML(node, {
      centered: false,
    });

    content = await TextHelper.attachmentsToSignedUrls(
      content,
      team.id,
      4 * Day.seconds
    );

    if (content) {
      // inline all css so that it works in as many email providers as possible.
      return await HTMLHelper.inlineCSS(content);
    }

    return;
  }
}
