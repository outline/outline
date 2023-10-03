import { ParameterizedContext, DefaultContext } from "koa";
import { IRouterParamContext } from "koa-router";
import { Transaction } from "sequelize";
import { z } from "zod";
import {
  CollectionSort,
  NavigationNode,
  Client,
  CollectionPermission,
} from "@shared/types";
import BaseSchema from "@server/routes/api/BaseSchema";
import { AccountProvisionerResult } from "./commands/accountProvisioner";
import { FileOperation, Team, User } from "./models";

export enum AuthenticationType {
  API = "api",
  APP = "app",
}

export type AuthenticationResult = AccountProvisionerResult & {
  client: Client;
};

export type Authentication = {
  user: User;
  token: string;
  type: AuthenticationType;
};

export type Pagination = {
  limit: number;
  offset: number;
  nextPath: string;
};

export type AppState = {
  auth: Authentication | Record<string, never>;
  transaction: Transaction;
  pagination: Pagination;
};

export type AppContext = ParameterizedContext<AppState, DefaultContext>;

export type BaseReq = z.infer<typeof BaseSchema>;

export type BaseRes = unknown;

export interface APIContext<ReqT = BaseReq, ResT = BaseRes>
  extends ParameterizedContext<
    AppState,
    DefaultContext & IRouterParamContext<AppState>,
    ResT
  > {
  /** Typed and validated version of request, consisting of validated body, query, etc */
  input: ReqT;
}

type BaseEvent = {
  teamId: string;
  actorId: string;
  ip: string;
};

export type ApiKeyEvent = BaseEvent & {
  name: "api_keys.create" | "api_keys.delete";
  modelId: string;
  data: {
    name: string;
  };
};

export type AttachmentEvent = BaseEvent &
  (
    | {
        name: "attachments.create";
        modelId: string;
        data: {
          name: string;
          source?: "import";
        };
      }
    | {
        name: "attachments.delete";
        modelId: string;
        data: {
          name: string;
        };
      }
  );

export type AuthenticationProviderEvent = BaseEvent & {
  name: "authenticationProviders.update";
  modelId: string;
  data: {
    enabled: boolean;
  };
};

export type UserEvent = BaseEvent &
  (
    | {
        name:
          | "users.signin"
          | "users.signout"
          | "users.update"
          | "users.suspend"
          | "users.activate"
          | "users.delete";
        userId: string;
      }
    | {
        name: "users.create" | "users.promote" | "users.demote";
        userId: string;
        data: {
          name: string;
        };
      }
    | {
        name: "users.invite";
        userId: string;
        data: {
          email: string;
          name: string;
        };
      }
  );

export type DocumentEvent = BaseEvent &
  (
    | {
        name:
          | "documents.create"
          | "documents.publish"
          | "documents.unpublish"
          | "documents.delete"
          | "documents.permanent_delete"
          | "documents.archive"
          | "documents.unarchive"
          | "documents.restore";
        documentId: string;
        collectionId: string;
        data: {
          title: string;
          source?: "import";
        };
      }
    | {
        name: "documents.move";
        documentId: string;
        collectionId: string;
        data: {
          collectionIds: string[];
          documentIds: string[];
        };
      }
    | {
        name:
          | "documents.update"
          | "documents.update.delayed"
          | "documents.update.debounced";
        documentId: string;
        collectionId: string;
        createdAt: string;
        data: {
          title: string;
          autosave: boolean;
          done: boolean;
        };
      }
    | {
        name: "documents.title_change";
        documentId: string;
        collectionId: string;
        createdAt: string;
        data: {
          title: string;
          previousTitle: string;
        };
      }
  );

export type RevisionEvent = BaseEvent & {
  name: "revisions.create";
  documentId: string;
  collectionId: string;
  modelId: string;
};

export type FileOperationEvent = BaseEvent & {
  name:
    | "fileOperations.create"
    | "fileOperations.update"
    | "fileOperations.delete";
  modelId: string;
  data: Partial<FileOperation>;
};

export type CollectionUserEvent = BaseEvent & {
  name: "collections.add_user" | "collections.remove_user";
  userId: string;
  collectionId: string;
};

export type CollectionGroupEvent = BaseEvent & {
  name: "collections.add_group" | "collections.remove_group";
  collectionId: string;
  modelId: string;
  data: {
    name: string;
  };
};

export type CollectionEvent = BaseEvent &
  (
    | CollectionUserEvent
    | CollectionGroupEvent
    | {
        name: "collections.create";
        collectionId: string;
        data: {
          name: string;
          source?: "import";
        };
      }
    | {
        name: "collections.update" | "collections.delete";
        collectionId: string;
        data: {
          name: string;
        };
      }
    | {
        name: "collections.move";
        collectionId: string;
        data: {
          index: string;
        };
      }
    | {
        name: "collections.permission_changed";
        collectionId: string;
        data: {
          privacyChanged: boolean;
          sharingChanged: boolean;
        };
      }
  );

export type GroupUserEvent = BaseEvent & {
  name: "groups.add_user" | "groups.remove_user";
  userId: string;
  modelId: string;
  data: {
    name: string;
  };
};

export type GroupEvent = BaseEvent &
  (
    | GroupUserEvent
    | {
        name: "groups.create" | "groups.delete" | "groups.update";
        modelId: string;
        data: {
          name: string;
        };
      }
  );

export type IntegrationEvent = BaseEvent & {
  name: "integrations.create" | "integrations.update" | "integrations.delete";
  modelId: string;
};

export type TeamEvent = BaseEvent & {
  name: "teams.create" | "teams.update";
  data: Partial<Team>;
};

export type PinEvent = BaseEvent & {
  name: "pins.create" | "pins.update" | "pins.delete";
  modelId: string;
  documentId: string;
  collectionId?: string;
};

export type CommentUpdateEvent = BaseEvent & {
  name: "comments.update";
  modelId: string;
  documentId: string;
  actorId: string;
  data: {
    newMentionIds: string[];
  };
};

export type CommentEvent =
  | (BaseEvent & {
      name: "comments.create";
      modelId: string;
      documentId: string;
      actorId: string;
    })
  | CommentUpdateEvent
  | (BaseEvent & {
      name: "comments.delete";
      modelId: string;
      documentId: string;
      actorId: string;
      collectionId: string;
    });

export type StarEvent = BaseEvent & {
  name: "stars.create" | "stars.update" | "stars.delete";
  modelId: string;
  documentId: string;
  userId: string;
};

export type ShareEvent = BaseEvent & {
  name: "shares.create" | "shares.update" | "shares.revoke";
  modelId: string;
  documentId: string;
  collectionId?: string;
  data: {
    name: string;
  };
};

export type SubscriptionEvent = BaseEvent & {
  name: "subscriptions.create" | "subscriptions.delete";
  modelId: string;
  userId: string;
  documentId: string | null;
};

export type ViewEvent = BaseEvent & {
  name: "views.create";
  documentId: string;
  collectionId: string;
  modelId: string;
  data: {
    title: string;
  };
};

export type WebhookSubscriptionEvent = BaseEvent & {
  name:
    | "webhookSubscriptions.create"
    | "webhookSubscriptions.delete"
    | "webhookSubscriptions.update";
  modelId: string;
  data: {
    name: string;
    url: string;
    events: string[];
  };
};

export type NotificationEvent = BaseEvent & {
  name: "notifications.create" | "notifications.update";
  modelId: string;
  teamId: string;
  userId: string;
  documentId?: string;
};

export type Event =
  | ApiKeyEvent
  | AttachmentEvent
  | AuthenticationProviderEvent
  | DocumentEvent
  | PinEvent
  | CommentEvent
  | StarEvent
  | CollectionEvent
  | FileOperationEvent
  | IntegrationEvent
  | GroupEvent
  | RevisionEvent
  | ShareEvent
  | SubscriptionEvent
  | TeamEvent
  | UserEvent
  | ViewEvent
  | WebhookSubscriptionEvent
  | NotificationEvent;

export type NotificationMetadata = {
  notificationId?: string;
};

export type JSONExportMetadata = {
  /** The version of the export, allows updated structure in the future. */
  exportVersion: number;
  /** The version of the application that created the export. */
  version: string;
  /** The date the export was created. */
  createdAt: string;
  /** The ID of the user that created the export. */
  createdById: string;
  /** The email of the user that created the export. */
  createdByEmail: string | null;
};

export type DocumentJSONExport = {
  id: string;
  urlId: string;
  title: string;
  data: Record<string, any>;
  createdById: string;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  fullWidth: boolean;
  template: boolean;
  parentDocumentId: string | null;
};

export type AttachmentJSONExport = {
  id: string;
  documentId: string | null;
  contentType: string;
  name: string;
  size: number;
  key: string;
};

export type CollectionJSONExport = {
  collection: {
    id: string;
    urlId: string;
    name: string;
    description: Record<string, any> | null;
    permission?: CollectionPermission | null;
    color: string;
    icon?: string | null;
    sort: CollectionSort;
    documentStructure: NavigationNode[] | null;
  };
  documents: {
    [id: string]: DocumentJSONExport;
  };
  attachments: {
    [id: string]: AttachmentJSONExport;
  };
};

export type UnfurlResolver = {
  unfurl: (url: string) => Promise<any>;
};
