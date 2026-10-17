import type { Document } from "@server/models";
import type { APIContext } from "@server/types";
import type { ChatMarkdown } from "./types";

/** An answer to a question, with the documents that it came from. */
export interface ChatAnswer {
  /** The answer, or an empty string if no answer was found. */
  answer: ChatMarkdown;
  /** The documents that the answer came from. */
  documents: Document[];
}

/**
 * Answers questions asked from a chat platform. Register an implementation
 * with `Hook.ChatAnswerProvider` to answer questions in place of a search.
 */
export interface ChatAnswerProvider {
  /**
   * Returns true if the text is a question that the provider can answer.
   *
   * @param ctx the context of the user that asked, for one team.
   * @param text the text that the user typed.
   * @returns true if the provider can answer.
   */
  canAnswer(ctx: APIContext, text: string): boolean;

  /**
   * Answers a question with the permissions of the user in the context.
   *
   * @param ctx the context of the user that asked, for one team.
   * @param question the question.
   * @returns the answer and its source documents.
   */
  answer(ctx: APIContext, question: string): Promise<ChatAnswer>;
}
