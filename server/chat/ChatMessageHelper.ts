import type { Collection, Document, Team } from "@server/models";
import type { ChatAction, ChatCard, ChatMarkdown } from "./types";

/**
 * Helpers to build neutral chat messages.
 */
export class ChatMessageHelper {
  /**
   * Escapes a string so that it shows as plain text in Markdown.
   *
   * @param text the untrusted text.
   * @returns the escaped Markdown.
   */
  public static escape(text: string): ChatMarkdown {
    return text.replace(/[\\`*_~[\]()<>|#]/g, "\\$&");
  }

  /**
   * Converts a search result context, which marks matches with `<b>` tags, to
   * Markdown on one line.
   *
   * @param context the search result context.
   * @returns the context as Markdown with the matches in bold.
   */
  public static fromSearchContext(context: string): ChatMarkdown {
    return context
      .replace(/\n/g, "")
      .split(/(<b>.*?<\/b>)/g)
      .map((part) => {
        const match = part.match(/^<b>(.*?)<\/b>$/);
        if (match) {
          return match[1] ? `**${this.escape(match[1])}**` : "";
        }
        return this.escape(part.replace(/<\/?b>/g, ""));
      })
      .join("");
  }

  /**
   * Builds a card that previews a document.
   *
   * @param document the document.
   * @param team the team of the document.
   * @param collection the collection of the document, if any.
   * @param text the body of the card, defaults to the document summary.
   * @param actions actions shown on the card.
   * @returns the card.
   */
  public static documentCard(
    document: Document,
    team: Team,
    collection?: Collection | null,
    text?: ChatMarkdown,
    actions?: ChatAction[]
  ): ChatCard {
    return {
      title: document.displayTitle,
      url: `${team.url}${document.url}`,
      text: text ?? this.escape(document.getSummary()),
      color: collection?.color ?? undefined,
      footer: collection?.name,
      timestamp: document.updatedAt,
      actions,
    };
  }
}
