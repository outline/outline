import * as Sentry from "@sentry/react";
import invariant from "invariant";
import { find } from "es-toolkit/compat";
import { action } from "mobx";
import { observer } from "mobx-react";
import { createContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  FileOperationState,
  FileOperationType,
  ImportState,
} from "@shared/types";
import { errToId, toError } from "@shared/utils/error";
import type RootStore from "~/stores/RootStore";
import type Collection from "~/models/Collection";
import type Comment from "~/models/Comment";
import type Document from "~/models/Document";
import type FileOperation from "~/models/FileOperation";
import type Group from "~/models/Group";
import type GroupMembership from "~/models/GroupMembership";
import type GroupUser from "~/models/GroupUser";
import type Import from "~/models/Import";
import type Membership from "~/models/Membership";
import type Notification from "~/models/Notification";
import type Pin from "~/models/Pin";
import type Star from "~/models/Star";
import type Subscription from "~/models/Subscription";
import type Team from "~/models/Team";
import type User from "~/models/User";
import type UserMembership from "~/models/UserMembership";
import useStores from "~/hooks/useStores";
import type {
  PartialExcept,
  WebsocketCollectionUpdateIndexEvent,
  WebsocketCommentReactionEvent,
  WebsocketEntitiesEvent,
  WebsocketEntityDeletedEvent,
} from "~/types";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import Logger from "~/utils/Logger";
import { getVisibilityListener, getPageVisible } from "~/utils/pageVisibility";

type SocketWithAuthentication = Socket & {
  authenticated?: boolean;
};

/** Identifiers of socket authentication errors that are expected in normal use. */
const unreportableErrorIds = [
  "authentication_required",
  "invalid_authentication",
];

export const WebsocketContext = createContext<SocketWithAuthentication | null>(
  null
);

function invalidateChildPolicies(
  documentId: string,
  { documents, policies }: Pick<RootStore, "documents" | "policies">
) {
  const document = documents.get(documentId);
  if (document) {
    document.childDocuments.forEach((childDocument) => {
      policies.remove(childDocument.id);
    });
  }
}

/**
 * Re-check the current user's access to a collection with the server and
 * discard whatever they can no longer read. Abilities cannot be recalculated on
 * the client, so access is never inferred from the cached policy.
 *
 * @param collectionId the ID of the collection access may have been lost to.
 * @param stores the stores to remove the collection and its documents from.
 */
async function revokeCollectionAccess(
  collectionId: string,
  {
    collections,
    documents,
    memberships,
    policies,
  }: Pick<RootStore, "collections" | "documents" | "memberships" | "policies">
) {
  policies.remove(collectionId);

  try {
    await collections.fetch(collectionId, { force: true });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof NotFoundError) {
      memberships.removeAll({ collectionId });
      collections.remove(collectionId, { permanent: true });
    } else {
      Logger.error(
        "Failed to fetch collection after access change",
        toError(err)
      );
    }
    return;
  }

  // Admins keep visibility of the collection itself, but may no longer be able
  // to read the documents within it.
  if (!policies.abilities(collectionId).readDocument) {
    documents.removeInCollection(collectionId);
  }
}

function useConnectionHandlers() {
  const { auth } = useStores();

  return (socket: SocketWithAuthentication) => {
    // on reconnection, reset the transports option, as the Websocket
    // connection may have failed (caused by proxy, firewall, browser, ...)
    socket.io.on("reconnect_attempt", () => {
      if (socket) {
        socket.io.opts.transports = auth?.team?.domain
          ? ["websocket"]
          : ["websocket", "polling"];
      }
    });

    socket.on("authenticated", () => {
      if (socket) {
        socket.authenticated = true;
      }
    });

    socket.on("unauthorized", (err: unknown) => {
      if (socket) {
        socket.authenticated = false;
      }

      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Socket unauthorized";

      toast.error(message);

      // Authentication failures are an expected result of an expired or
      // otherwise unusable token, there is nothing to report.
      const errorId = errToId(err);
      if (errorId && unreportableErrorIds.includes(errorId)) {
        return;
      }

      if (err instanceof Error) {
        Sentry.captureException(err);
      } else {
        Sentry.captureException(new Error(message), {
          extra: {
            unauthorizedPayload: err,
          },
        });
      }
    });

    // add a listener for all events that logs a sentry breadcrumb
    socket.onAny((event: string, data: Record<string, unknown>) => {
      Sentry.addBreadcrumb({
        category: "websocket",
        message: `Received event: ${event}`,
        data,
      });
    });
  };
}

function useEntityHandlers() {
  const { documents, collections, policies, memberships } = useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on(
      "entities",
      action(async (event: WebsocketEntitiesEvent) => {
        if (event.documentIds) {
          for (const documentDescriptor of event.documentIds) {
            const documentId = documentDescriptor.id;
            let document = documents.get(documentId);
            const previousTitle = document?.title;

            // if we already have the latest version (it was us that performed
            // the change) then we don't need to update anything either.
            if (document?.updatedAt === documentDescriptor.updatedAt) {
              continue;
            }
            if (!document) {
              continue;
            }

            if (event.invalidatedPolicies) {
              event.invalidatedPolicies.forEach((policyId) => {
                policies.remove(policyId);
              });
            }

            // otherwise, grab the latest version of the document
            try {
              document = await documents.fetch(documentId, {
                force: true,
              });
            } catch (err) {
              if (
                err instanceof AuthorizationError ||
                err instanceof NotFoundError
              ) {
                documents.remove(documentId, { permanent: true });
                continue;
              }
            }

            // if the title changed then we need to update the collection also
            if (document && previousTitle !== document.title) {
              if (!event.collectionIds) {
                event.collectionIds = [];
              }

              const existing = find(event.collectionIds, {
                id: document.collectionId,
              });

              if (!existing && document.collectionId) {
                event.collectionIds.push({
                  id: document.collectionId,
                });
              }
            }
          }
        }

        if (event.collectionIds) {
          for (const collectionDescriptor of event.collectionIds) {
            const collectionId = collectionDescriptor.id;
            const collection = collections.get(collectionId);

            // if we already have the latest version (it was us that performed
            // the change) then we don't need to update anything either.
            if (collection?.updatedAt === collectionDescriptor.updatedAt) {
              continue;
            }
            if (!collection?.documents) {
              continue;
            }

            if (event.invalidatedPolicies) {
              event.invalidatedPolicies.forEach((policyId) => {
                policies.remove(policyId);
              });
            }

            try {
              await collection?.fetchDocuments({
                force: true,
              });
            } catch (err) {
              if (
                err instanceof AuthorizationError ||
                err instanceof NotFoundError
              ) {
                memberships.removeAll({ collectionId });
                collections.remove(collectionId, { permanent: true });
                continue;
              }
            }
          }
        }
      })
    );
  };
}

function useDocumentHandlers() {
  const {
    auth,
    documents,
    collections,
    policies,
    userMemberships,
    groupMemberships,
    groups,
  } = useStores();

  return (socket: SocketWithAuthentication) => {
    const currentUserId = auth?.user?.id;

    socket.on(
      "documents.update",
      action((event: PartialExcept<Document, "id" | "title" | "url">) => {
        documents.add(event);

        if (event.collectionId) {
          const collection = collections.get(event.collectionId);
          collection?.updateDocument(event);
        }
      })
    );

    socket.on(
      "documents.unpublish",
      action(
        (event: {
          document: PartialExcept<Document, "id">;
          collectionId: string;
        }) => {
          const document = event.document;

          // When document is detached as part of unpublishing, only the owner should be able to view it.
          if (
            !document.collectionId &&
            document.createdBy?.id !== currentUserId
          ) {
            documents.remove(document.id, { permanent: true });
          } else {
            documents.add(document);
          }
          policies.remove(document.id);

          if (event.collectionId) {
            const collection = collections.get(event.collectionId);
            collection?.removeDocument(document.id);
          }
        }
      )
    );

    socket.on(
      "documents.archive",
      action((event: PartialExcept<Document, "id">) => {
        const model = documents.add(event);
        documents.addToArchive(model);

        if (event.collectionId) {
          const collection = collections.get(event.collectionId);
          collection?.removeDocument(event.id);
        }
      })
    );

    socket.on(
      "documents.delete",
      action((event: PartialExcept<Document, "id">) => {
        documents.add(event);
        policies.remove(event.id);

        if (event.collectionId) {
          const collection = collections.get(event.collectionId);
          collection?.removeDocument(event.id);
        }

        userMemberships.orderedData
          .filter((m) => m.documentId === event.id)
          .forEach((m) => userMemberships.remove(m.id));
      })
    );

    socket.on(
      "documents.permanent_delete",
      (event: WebsocketEntityDeletedEvent) => {
        documents.remove(event.modelId, { permanent: true });
      }
    );

    socket.on(
      "documents.add_user",
      async (event: PartialExcept<UserMembership, "id">) => {
        const membership = userMemberships.add(event);

        if (event.userId === currentUserId) {
          invalidateChildPolicies(event.documentId!, { documents, policies });
        }

        try {
          // The event only references related models by ID, load any that are
          // not already in memory so that the membership can be displayed.
          await Promise.all([
            documents.fetch(event.documentId!, {
              force: event.userId === currentUserId,
            }),
            membership.loadRelations({ withoutPolicies: true }),
          ]);
        } catch (err) {
          Logger.error("Failed to fetch document after add_user", toError(err));
        }
      }
    );

    socket.on(
      "documents.remove_user",
      (event: PartialExcept<UserMembership, "id">) => {
        userMemberships.remove(event.id);

        if (event.userId === currentUserId) {
          invalidateChildPolicies(event.documentId!, { documents, policies });
        }

        const policy = policies.get(event.documentId!);
        if (policy && policy.abilities.read === false) {
          documents.remove(event.documentId!, { permanent: true });
        }
      }
    );

    socket.on(
      "documents.add_group",
      async (event: PartialExcept<GroupMembership, "id">) => {
        const membership = groupMemberships.add(event);

        const group = groups.get(event.groupId!);

        if (currentUserId && group?.users.some((u) => u.id === currentUserId)) {
          invalidateChildPolicies(event.documentId!, { documents, policies });
        }

        try {
          // The event only references related models by ID, load any that are
          // not already in memory so that the membership can be displayed.
          await membership.loadRelations({ withoutPolicies: true });
        } catch (err) {
          Logger.error(
            "Failed to load relations after add_group",
            toError(err)
          );
        }
      }
    );

    socket.on(
      "documents.remove_group",
      (event: PartialExcept<GroupMembership, "id">) => {
        groupMemberships.remove(event.id);

        const policy = policies.get(event.documentId!);
        if (policy && policy.abilities.read === false) {
          documents.remove(event.documentId!, { permanent: true });
        }
      }
    );
  };
}

function useCollectionHandlers() {
  const {
    auth,
    collections,
    documents,
    policies,
    memberships,
    groupMemberships,
  } = useStores();

  return (socket: SocketWithAuthentication) => {
    const currentUserId = auth?.user?.id;

    socket.on(
      "collections.create",
      (event: PartialExcept<Collection, "id">) => {
        collections.add(event);
      }
    );

    socket.on(
      "collections.update",
      (event: PartialExcept<Collection, "id">) => {
        collections.add(event);
      }
    );

    socket.on(
      "collections.delete",
      action((event: WebsocketEntityDeletedEvent) => {
        const collectionId = event.modelId;
        const deletedAt = new Date().toISOString();
        const deletedDocuments = documents.inCollection(collectionId);
        deletedDocuments.forEach((doc) => {
          if (!doc.publishedAt) {
            // draft is to be detached from collection, not deleted
            doc.collectionId = null;
          } else {
            doc.deletedAt = deletedAt;
          }
          policies.remove(doc.id);
        });
        memberships.removeAll({ collectionId });
        collections.remove(collectionId);
      })
    );

    socket.on(
      "collections.archive",
      async (event: PartialExcept<Collection, "id">) => {
        const collectionId = event.id;

        // Fetch collection to update policies
        try {
          await collections.fetch(collectionId, { force: true });
        } catch (err) {
          Logger.error(
            "Failed to fetch collection after archive",
            toError(err)
          );
        }

        documents.unarchivedInCollection(collectionId).forEach(
          action((doc) => {
            if (!doc.publishedAt) {
              // draft is to be detached from collection, not archived
              doc.collectionId = null;
            } else {
              doc.archivedAt = event.archivedAt as string;
            }
            policies.remove(doc.id);
          })
        );
      }
    );

    socket.on(
      "collections.restore",
      async (event: PartialExcept<Collection, "id">) => {
        const collectionId = event.id;
        documents
          .archivedInCollection(collectionId, {
            archivedAt: event.archivedAt as string,
          })
          .forEach(
            action((doc) => {
              doc.archivedAt = null;
              policies.remove(doc.id);
            })
          );

        // Fetch collection to update policies
        try {
          await collections.fetch(collectionId, { force: true });
        } catch (err) {
          Logger.error(
            "Failed to fetch collection after restore",
            toError(err)
          );
        }
      }
    );

    socket.on("collections.add_user", async (event: Membership) => {
      const membership = memberships.add(event);
      try {
        // The event only references related models by ID, load any that are not
        // already in memory so that the membership can be displayed.
        await Promise.all([
          collections.fetch(event.collectionId, {
            force: event.userId === currentUserId,
          }),
          membership.loadRelations({ withoutPolicies: true }),
        ]);
      } catch (err) {
        Logger.error("Failed to fetch collection after add_user", toError(err));
      }
    });

    socket.on("collections.remove_user", async (event: Membership) => {
      memberships.remove(event.id);

      if (event.userId === currentUserId) {
        await revokeCollectionAccess(event.collectionId, {
          collections,
          documents,
          memberships,
          policies,
        });
      }
    });

    socket.on("collections.add_group", async (event: GroupMembership) => {
      const membership = groupMemberships.add(event);
      try {
        // The event only references related models by ID, load any that are not
        // already in memory so that the membership can be displayed.
        await membership.loadRelations({ withoutPolicies: true });
      } catch (err) {
        Logger.error(
          "Failed to fetch collection after add_group",
          toError(err)
        );
      }
    });

    socket.on("collections.remove_group", async (event: GroupMembership) => {
      groupMemberships.remove(event.id);

      // The event reaches everyone with access to the collection, so the policy
      // narrows it to those that may have held it through the group.
      const policy = policies.get(event.collectionId!);
      if (!policy || policy.abilities.read === false) {
        await revokeCollectionAccess(event.collectionId!, {
          collections,
          documents,
          memberships,
          policies,
        });
      }
    });

    socket.on(
      "collections.revoke_access",
      async (event: WebsocketEntityDeletedEvent) =>
        revokeCollectionAccess(event.modelId, {
          collections,
          documents,
          memberships,
          policies,
        })
    );

    socket.on(
      "collections.update_index",
      action((event: WebsocketCollectionUpdateIndexEvent) => {
        const collection = collections.get(event.collectionId);
        collection?.updateIndex(event.index);
      })
    );
  };
}

function useCommentHandlers() {
  const { comments, policies } = useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on("comments.create", (event: PartialExcept<Comment, "id">) => {
      comments.add(event);
    });

    socket.on("comments.update", (event: PartialExcept<Comment, "id">) => {
      const comment = comments.get(event.id);

      // Existing policy becomes invalid when the resolution status has changed and we don't have the latest version.
      if (comment?.resolvedAt !== event.resolvedAt) {
        policies.remove(event.id);
      }

      comments.add(event);
    });

    socket.on("comments.delete", (event: WebsocketEntityDeletedEvent) => {
      comments.remove(event.modelId);
    });

    socket.on(
      "comments.add_reaction",
      (event: WebsocketCommentReactionEvent) => {
        const comment = comments.get(event.commentId);
        comment?.updateReaction({
          type: "add",
          emoji: event.emoji,
          user: event.user,
        });
      }
    );

    socket.on(
      "comments.remove_reaction",
      (event: WebsocketCommentReactionEvent) => {
        const comment = comments.get(event.commentId);
        comment?.updateReaction({
          type: "remove",
          emoji: event.emoji,
          user: event.user,
        });
      }
    );
  };
}

function useGroupHandlers() {
  const { groups, groupUsers } = useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on("groups.create", (event: PartialExcept<Group, "id">) => {
      groups.add(event);
    });

    socket.on("groups.update", (event: PartialExcept<Group, "id">) => {
      groups.add(event);
    });

    socket.on("groups.delete", (event: WebsocketEntityDeletedEvent) => {
      groups.remove(event.modelId);
    });

    socket.on(
      "groups.add_user",
      async (event: PartialExcept<GroupUser, "id">) => {
        const groupUser = groupUsers.add(event);

        try {
          // The event only references related models by ID, load any that are
          // not already in memory so that the membership can be displayed.
          await groupUser.loadRelations({ withoutPolicies: true });
        } catch (err) {
          Logger.error("Failed to load relations after add_user", toError(err));
        }
      }
    );

    socket.on("groups.remove_user", (event: PartialExcept<GroupUser, "id">) => {
      groupUsers.removeAll({
        groupId: event.groupId,
        userId: event.userId,
      });
    });
  };
}

function useTeamHandlers() {
  const { auth, documents, policies } = useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on("teams.update", (event: PartialExcept<Team, "id">) => {
      if ("sharing" in event && event.sharing !== auth.team?.sharing) {
        documents.all.forEach((document) => {
          policies.remove(document.id);
        });
      }

      auth.team?.updateData(event);
    });
  };
}

function useUserHandlers() {
  const { auth, users, userMemberships, documents, collections, policies } =
    useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on("users.update", (event: PartialExcept<User, "id">) => {
      users.add(event);
    });

    // the current user's role changed, so their policies are invalid and the
    // set of accessible collections may have changed.
    const handleRoleChange = async (event: PartialExcept<User, "id">) => {
      if (event.id === auth.user?.id) {
        documents.all.forEach((document) => policies.remove(document.id));
        try {
          await collections.fetchAll();
        } catch (err) {
          Logger.error(
            "Failed to fetch collections after role change",
            toError(err)
          );
        }
      }
    };

    socket.on("users.promote", handleRoleChange);
    socket.on("users.demote", handleRoleChange);

    socket.on("users.delete", (event: WebsocketEntityDeletedEvent) => {
      users.remove(event.modelId);
    });

    socket.on(
      "userMemberships.update",
      async (event: PartialExcept<UserMembership, "id">) => {
        userMemberships.add(event);
      }
    );
  };
}

function useNotificationHandlers() {
  const { notifications, subscriptions } = useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on(
      "notifications.create",
      (event: PartialExcept<Notification, "id">) => {
        notifications.add(event);
      }
    );

    socket.on(
      "notifications.update",
      (event: PartialExcept<Notification, "id">) => {
        notifications.add(event);
      }
    );

    socket.on("notifications.delete", (event: WebsocketEntityDeletedEvent) => {
      notifications.remove(event.modelId);
    });

    socket.on(
      "subscriptions.create",
      (event: PartialExcept<Subscription, "id">) => {
        subscriptions.add(event);
      }
    );

    socket.on("subscriptions.delete", (event: WebsocketEntityDeletedEvent) => {
      subscriptions.remove(event.modelId);
    });
  };
}

function usePinHandlers() {
  const { pins } = useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on("pins.create", (event: PartialExcept<Pin, "id">) => {
      pins.add(event);
    });

    socket.on("pins.update", (event: PartialExcept<Pin, "id">) => {
      pins.add(event);
    });

    socket.on("pins.delete", (event: WebsocketEntityDeletedEvent) => {
      pins.remove(event.modelId);
    });
  };
}

function useStarHandlers() {
  const { stars } = useStores();

  return (socket: SocketWithAuthentication) => {
    socket.on("stars.create", (event: PartialExcept<Star, "id">) => {
      stars.add(event);
    });

    socket.on("stars.update", (event: PartialExcept<Star, "id">) => {
      stars.add(event);
    });

    socket.on("stars.delete", (event: WebsocketEntityDeletedEvent) => {
      stars.remove(event.modelId);
    });
  };
}

function useImportHandlers() {
  const { auth, fileOperations, imports } = useStores();
  const { t } = useTranslation();

  return (socket: SocketWithAuthentication) => {
    socket.on(
      "fileOperations.create",
      (event: PartialExcept<FileOperation, "id">) => {
        fileOperations.add(event);
      }
    );

    socket.on(
      "fileOperations.update",
      (event: PartialExcept<FileOperation, "id">) => {
        fileOperations.add(event);

        if (
          event.state === FileOperationState.Complete &&
          event.type === FileOperationType.Import &&
          event.user?.id === auth.user?.id
        ) {
          toast.success(event.name, {
            description: t("Your import completed"),
          });
        }
      }
    );

    socket.on("imports.create", (event: PartialExcept<Import, "id">) => {
      imports.add(event);
    });

    socket.on("imports.update", (event: PartialExcept<Import, "id">) => {
      imports.add(event);

      if (
        event.state === ImportState.Completed &&
        event.createdBy?.id === auth.user?.id
      ) {
        toast.success(event.name, {
          description: t("Your import completed"),
        });
      }
    });
  };
}

function WebsocketProvider({ children }: React.PropsWithChildren<object>) {
  const [socket, setSocket] = useState<SocketWithAuthentication | null>(null);

  const registerConnectionHandlers = useConnectionHandlers();
  const registerEntityHandlers = useEntityHandlers();
  const registerDocumentHandlers = useDocumentHandlers();
  const registerCollectionHandlers = useCollectionHandlers();
  const registerCommentHandlers = useCommentHandlers();
  const registerGroupHandlers = useGroupHandlers();
  const registerTeamHandlers = useTeamHandlers();
  const registerUserHandlers = useUserHandlers();
  const registerNotificationHandlers = useNotificationHandlers();
  const registerPinHandlers = usePinHandlers();
  const registerStarHandlers = useStarHandlers();
  const registerImportHandlers = useImportHandlers();

  useEffect(() => {
    let currentSocket: SocketWithAuthentication | null = null;

    function createConnection() {
      currentSocket = io(window.location.origin, {
        path: "/realtime",
        transports: ["websocket"],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        withCredentials: true,
      });
      invariant(currentSocket, "Socket should be defined");

      currentSocket.authenticated = false;

      registerConnectionHandlers(currentSocket);
      registerEntityHandlers(currentSocket);
      registerDocumentHandlers(currentSocket);
      registerCollectionHandlers(currentSocket);
      registerCommentHandlers(currentSocket);
      registerGroupHandlers(currentSocket);
      registerTeamHandlers(currentSocket);
      registerUserHandlers(currentSocket);
      registerNotificationHandlers(currentSocket);
      registerPinHandlers(currentSocket);
      registerStarHandlers(currentSocket);
      registerImportHandlers(currentSocket);

      setSocket(currentSocket);
    }

    function checkConnection() {
      if (currentSocket?.disconnected && getPageVisible()) {
        // null-ifying this reference is important, do not remove. Without it
        // references to old sockets are potentially held in context
        currentSocket.close();
        currentSocket = null;
        setSocket(null);
        createConnection();
      }
    }

    createConnection();
    document.addEventListener(getVisibilityListener(), checkConnection);

    return () => {
      if (currentSocket) {
        currentSocket.authenticated = false;
        currentSocket.disconnect();
      }
      document.removeEventListener(getVisibilityListener(), checkConnection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WebsocketContext.Provider value={socket}>
      {children}
    </WebsocketContext.Provider>
  );
}

export default observer(WebsocketProvider);
