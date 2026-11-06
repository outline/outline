import type { IntegrationAuthentication } from "@server/models";

/**
 * Markdown text. Providers convert it to the format of their platform. Use
 * `ChatMessageHelper.escape` for untrusted strings.
 */
export type ChatMarkdown = string;

/** The installation of the app that received an event. */
export interface ChatInstallationRef {
  /** The ID of the workspace that the app is installed in, e.g. a Slack team ID. */
  serviceTeamId: string;
}

/** A reference to a user on a chat platform. */
export interface ChatUserRef {
  /**
   * The ID of the home workspace of the user. In shared channels this can
   * differ from the installation.
   */
  serviceTeamId: string;
  /** The ID of the user on the chat platform. */
  serviceUserId: string;
}

/** A reference to a channel, direct message or thread on a chat platform. */
export interface ChatConversationRef {
  /** The ID of the channel or direct message. */
  channelId: string;
}

/** An action that a user can take on a message. */
export interface ChatAction {
  /** The type of action. */
  id: "postDocument" | "postAnswer";
  /** The button label. */
  label: string;
  /** The ID of the item that the action applies to. */
  value: string;
}

/** A preview of an item in Outline, shown with a message. */
export interface ChatCard {
  /** Plain text title. */
  title: string;
  /** The URL that the title links to. */
  url: string;
  /** The body of the card. */
  text?: ChatMarkdown;
  /** An accent color as a hex string. */
  color?: string;
  /** Plain text shown below the card. */
  footer?: string;
  /** The time shown in the footer. */
  timestamp?: Date;
  /** Actions shown on the card. */
  actions?: ChatAction[];
}

/** Who can see a message. */
export type ChatVisibility = "ephemeral" | "conversation";

/** A message in a neutral format, rendered by each provider. */
export interface ChatMessage {
  /** Plain text shown above the message in a smaller font. */
  context?: string;
  /** The body of the message. */
  text: ChatMarkdown;
  /** Who can see the message. */
  visibility: ChatVisibility;
  /** Previews shown with the message. */
  cards: ChatCard[];
  /** Actions shown below the message. */
  actions?: ChatAction[];
}

/** An event received from a chat platform. */
export type ChatEvent<TTarget> = {
  /** The installation that received the event. */
  installation: ChatInstallationRef;
  /** The user that caused the event. */
  actor: ChatUserRef;
  /** Where to send a later reply. Must serialize to JSON. */
  replyTarget: TTarget;
} & (
  | {
      type: "command";
      /** The text that the user typed after the command. */
      text: string;
    }
  | {
      type: "linksShared";
      conversation: ChatConversationRef;
      /** The ID of the message that contains the links. */
      messageId: string;
      urls: string[];
    }
  | {
      type: "action";
      action: ChatAction["id"];
      value: string;
    }
);

/** The result of parsing an inbound request. */
export type ChatRequest<TTarget> =
  | ChatEvent<TTarget>
  | {
      /** A verification request from the platform, answered with the body. */
      type: "handshake";
      body: Record<string, string>;
    };

/** The result of handling an event. */
export type ChatResult =
  | { type: "message"; message: ChatMessage }
  | {
      /** A message to show now, replaced later with `BaseChatProvider.reply`. */
      type: "deferred";
      message: ChatMessage;
    }
  | {
      type: "linkPreviews";
      cards: Map<string, ChatCard>;
      authentication: IntegrationAuthentication;
    }
  | { type: "none" };

/** The features that a chat provider supports. */
export interface ChatCapabilities {
  /** Buttons on messages. */
  messageActions: boolean;
}

/** The result of an install flow on a chat platform. */
export interface ChatInstall {
  /** The access token for the platform API. */
  token: string;
  /** The scopes that the token has. */
  scopes: string[];
  /** The ID of the workspace on the chat platform. */
  serviceTeamId: string;
  /** The ID of the user that did the install. */
  serviceUserId: string;
  /** The channel selected for notifications, if any. */
  channel?: { id: string; name: string; webhookUrl: string };
}
