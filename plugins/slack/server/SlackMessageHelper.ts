import type {
  ChatAction,
  ChatCard,
  ChatMarkdown,
  ChatMessage,
} from "@server/chat/types";

/** The maximum length of a Block Kit text object. */
const maxBlockTextLength = 3000;

/** The Slack action IDs for each chat action. */
const actionIds: Record<ChatAction["id"], string> = {
  postDocument: "post",
  postAnswer: "post_answer_to_channel",
};

/**
 * Converts neutral chat messages to Slack message payloads.
 */
export class SlackMessageHelper {
  /**
   * Returns the chat action for a Slack block action ID.
   *
   * @param actionId the Slack action ID.
   * @returns the chat action, if known.
   */
  public static actionFromId(actionId: string): ChatAction["id"] | undefined {
    switch (actionId) {
      case actionIds.postDocument:
        return "postDocument";
      case actionIds.postAnswer:
        return "postAnswer";
      default:
        return undefined;
    }
  }

  /**
   * Converts a message to a Slack message payload.
   *
   * @param message the message.
   * @returns the Slack payload.
   */
  public static toPayload(message: ChatMessage) {
    const text = this.toMrkdwn(message.text);
    const blocks = [];

    if (message.context) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "plain_text",
            text: this.truncate(message.context, maxBlockTextLength),
            emoji: true,
          },
        ],
      });
    }
    for (const chunk of this.splitMrkdwn(text, maxBlockTextLength)) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: chunk } });
    }
    if (message.actions?.length) {
      blocks.push({
        type: "actions",
        elements: message.actions.map((action) => ({
          type: "button",
          text: { type: "plain_text", text: action.label },
          action_id: actionIds[action.id],
          value: action.value,
        })),
      });
    }

    return {
      text: text || message.context || "",
      blocks: blocks.length ? blocks : undefined,
      attachments: message.cards.length
        ? message.cards.map((card) => this.toAttachment(card))
        : undefined,
    };
  }

  /**
   * Converts a card to a Slack link unfurl.
   *
   * @param card the card.
   * @returns the Slack unfurl.
   */
  public static toUnfurl(card: ChatCard) {
    return {
      title: card.title,
      text: card.text ? this.toMrkdwn(card.text) : undefined,
      color: card.color,
    };
  }

  /**
   * Converts Markdown to Slack mrkdwn. Supports bold, links and backslash
   * escapes; other text is escaped so that it cannot form Slack controls.
   *
   * @param markdown the Markdown.
   * @returns the Slack mrkdwn.
   */
  public static toMrkdwn(markdown: ChatMarkdown): string {
    let output = "";
    let index = 0;

    while (index < markdown.length) {
      const char = markdown[index];

      if (char === "\\" && index + 1 < markdown.length) {
        output += this.escapeText(markdown[index + 1]);
        index += 2;
        continue;
      }

      if (markdown.startsWith("**", index)) {
        output += "*";
        index += 2;
        continue;
      }

      if (char === "[") {
        const link = this.parseLink(markdown, index);
        if (link) {
          output += `<${this.escapeUrl(link.url)}|${this.toMrkdwn(link.text)}>`;
          index = link.end;
          continue;
        }
      }

      output += this.escapeText(char);
      index += 1;
    }

    return output;
  }

  /**
   * Splits Slack mrkdwn into parts no longer than the limit. Parts end at a
   * line break or space where possible, and never inside a link or entity.
   *
   * @param text the Slack mrkdwn.
   * @param limit the maximum length of each part.
   * @returns the parts.
   */
  public static splitMrkdwn(text: string, limit: number): string[] {
    const parts: string[] = [];
    let remaining = text;

    while (remaining.length > limit) {
      let index = remaining.lastIndexOf("\n", limit);
      if (index < limit / 2) {
        index = remaining.lastIndexOf(" ", limit);
      }
      if (index < limit / 2) {
        index = limit;
      }

      // Do not split inside a <link|label> or an &entity;.
      const linkStart = remaining.lastIndexOf("<", index - 1);
      if (linkStart > remaining.lastIndexOf(">", index - 1)) {
        index = linkStart;
      }
      const entityStart = remaining.lastIndexOf("&", index - 1);
      if (
        entityStart > remaining.lastIndexOf(";", index - 1) &&
        index - entityStart < 8
      ) {
        index = entityStart;
      }
      if (index <= 0) {
        index = limit;
      }

      const part = remaining.slice(0, index).trimEnd();
      if (part) {
        parts.push(part);
      }
      remaining = remaining.slice(index).trimStart();
    }

    if (remaining) {
      parts.push(remaining);
    }
    return parts;
  }

  private static truncate(text: string, limit: number) {
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }

  private static toAttachment(card: ChatCard) {
    const postDocument = card.actions?.find(
      (action) => action.id === "postDocument"
    );

    return {
      color: card.color,
      title: card.title,
      title_link: card.url,
      footer: card.footer,
      callback_id: postDocument?.value,
      text: card.text ? this.toMrkdwn(card.text) : undefined,
      ts: card.timestamp
        ? Math.round(card.timestamp.getTime() / 1000)
        : undefined,
      actions: card.actions?.map((action) => ({
        name: actionIds[action.id],
        text: action.label,
        type: "button",
        value: action.value,
      })),
    };
  }

  private static parseLink(markdown: string, start: number) {
    let index = start + 1;
    while (index < markdown.length && markdown[index] !== "]") {
      index += markdown[index] === "\\" ? 2 : 1;
    }
    if (markdown[index] !== "]" || markdown[index + 1] !== "(") {
      return undefined;
    }

    const end = markdown.indexOf(")", index + 2);
    if (end === -1) {
      return undefined;
    }

    return {
      text: markdown.slice(start + 1, index),
      url: markdown.slice(index + 2, end),
      end: end + 1,
    };
  }

  private static escapeText(text: string) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private static escapeUrl(url: string) {
    return url.replace(/[<>| ]/g, (char) => encodeURIComponent(char));
  }
}
