import * as React from "react";
import { TeamPreference } from "@shared/types";
import { Day } from "@shared/utils/time";
import { Revision, Share, ShareSubscription } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import HTMLHelper from "@server/models/helpers/HTMLHelper";
import ShareSubscriptionHelper from "@server/models/helpers/ShareSubscriptionHelper";
import { CacheHelper } from "@server/utils/CacheHelper";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  shareSubscriptionId: string;
  documentTitle: string;
  shareUrl: string;
  revisionId?: string;
};

type BeforeSend = {
  unsubscribeUrl: string;
  body: string | undefined;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a share subscriber when the shared document is updated.
 */
export default class ShareDocumentUpdatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend(props: InputProps) {
    const subscription = await ShareSubscription.findByPk(
      props.shareSubscriptionId,
      {
        include: [
          {
            model: Share.unscoped(),
            include: [{ association: "team" }],
          },
        ],
      }
    );

    if (
      !subscription ||
      subscription.isUnsubscribed ||
      !subscription.isConfirmed
    ) {
      return false;
    }

    let body;
    const team = subscription.share?.team;
    if (
      props.revisionId &&
      team?.getPreference(TeamPreference.PreviewsInEmails)
    ) {
      body = await CacheHelper.getDataOrSet<string>(
        `diff:share:${props.revisionId}`,
        async () => {
          // generate the diff html for the email
          const revision = await Revision.findByPk(props.revisionId!);

          if (revision) {
            const before = await revision.before();
            const content = await DocumentHelper.toEmailDiff(before, revision, {
              includeTitle: false,
              centered: false,
              signedUrls: 4 * Day.seconds,
              baseUrl: props.shareUrl,
            });

            // inline all css so that it works in as many email providers as possible.
            return content ? await HTMLHelper.inlineCSS(content) : undefined;
          }
          return;
        },
        30,
        10000
      );
    }

    return {
      unsubscribeUrl: ShareSubscriptionHelper.unsubscribeUrl(subscription),
      body,
    };
  }

  protected unsubscribeUrl({ unsubscribeUrl }: Props) {
    return unsubscribeUrl;
  }

  protected subject({ documentTitle }: Props) {
    return this.t(`"{{ documentTitle }}" updated`, { documentTitle });
  }

  protected preview({ documentTitle }: Props): string {
    return this.t('"{{ documentTitle }}" has been updated.', { documentTitle });
  }

  protected renderAsText({ documentTitle, shareUrl }: Props): string {
    return `
${this.t(`"{{ documentTitle }}" updated`, { documentTitle })}

${this.t("A document you subscribed to has been updated.")}

${this.t("View Document")}: ${shareUrl}
`;
  }

  protected render({ documentTitle, shareUrl, unsubscribeUrl, body }: Props) {
    const documentLink = `${shareUrl}?ref=subscription-email`;

    return (
      <EmailTemplate
        previewText={this.preview({ documentTitle } as Props)}
        goToAction={{ url: documentLink, name: this.t("View Document") }}
      >
        <Header />

        <Body>
          <Heading>
            {this.t(`"{{ documentTitle }}" updated`, { documentTitle })}
          </Heading>
          <p>
            {this.t("A document you subscribed to has been updated.")}{" "}
            {this.t("Click below to view the latest version.")}
          </p>
          {body && (
            <>
              <EmptySpace height={20} />
              <Diff>
                <div dangerouslySetInnerHTML={{ __html: body }} />
              </Diff>
              <EmptySpace height={20} />
            </>
          )}
          <EmptySpace height={10} />
          <p>
            <Button href={documentLink}>{this.t("View Document")}</Button>
          </p>
        </Body>

        <Footer
          unsubscribeUrl={unsubscribeUrl}
          unsubscribeText={this.t("Unsubscribe from these emails")}
        />
      </EmailTemplate>
    );
  }
}
