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
import { toError } from "@shared/utils/error";
import type RootStore from "~/stores/RootStore";
import type Notebook from "~/models/Notebook";
import type Comment from "~/models/Comment";
import type Note from "~/models/Note";
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
  WebsocketCommentReactionEvent,
  WebsocketEntitiesEvent,
  WebsocketEntityDeletedEvent,
  WebsocketNotebookUpdateIndexEvent,
} from "~/types";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import Logger from "~/utils/Logger";
import { getVisibilityListener, getPageVisible } from "~/utils/pageVisibility";
type SocketWithAuthentication = Socket & {
  authenticated?: boolean;
};
export const WebsocketContext = createContext<SocketWithAuthentication | null>(
  null
);
function invalidateChildPolicies(
  noteId: string,
  { notes, policies }: Pick<RootStore, "notes" | "policies">
) {
  const note = notes.get(noteId);
  if (note) {
    note.childNotes.forEach((childNote) => {
      policies.remove(childNote.id);
    });
  }
}
/**
 * Re-check the current user's access to a collection with the server and
 * discard whatever they can no longer read. Abilities cannot be recalculated on
 * the client, so access is never inferred from the cached policy.
 *
 * @param collectionId the ID of the collection access may have been lost to.
 * @param stores the stores to remove the collection and its notes from.
 */
async function revokeNotebookAccess(
  notebookId: string,
  {
    notebooks,
    notes,
    memberships,
    policies,
  }: Pick<RootStore, "notebooks" | "notes" | "memberships" | "policies">
) {
  policies.remove(notebookId);
  try {
    await notebooks.fetch(notebookId, { force: true });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof NotFoundError) {
      memberships.removeAll({ notebookId });
      notebooks.remove(notebookId, { permanent: true });
    } else {
      Logger.error(
        "Failed to fetch collection after access change",
        toError(err)
      );
    }
    return;
  }
  // Admins keep visibility of the collection itself, but may no longer be able
  // to read the notes within it.
  if (!policies.abilities(notebookId).readNote) {
    notes.removeInNotebook(notebookId);
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
            ? String(
                (
                  err as {
                    message: unknown;
                  }
                ).message
              )
            : "Socket unauthorized";
      toast.error(message);
      if (message === "No access token") {
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
  const { notes, notebooks, policies, memberships } = useStores();
  return (socket: SocketWithAuthentication) => {
    socket.on(
      "entities",
      action(async (event: WebsocketEntitiesEvent) => {
        if (event.noteIds) {
          for (const noteDescriptor of event.noteIds) {
            const noteId = noteDescriptor.id;
            let note = notes.get(noteId);
            const previousTitle = note?.title;
            // if we already have the latest version (it was us that performed
            // the change) then we don't need to update anything either.
            if (note?.updatedAt === noteDescriptor.updatedAt) {
              continue;
            }
            if (!note) {
              continue;
            }
            if (event.invalidatedPolicies) {
              event.invalidatedPolicies.forEach((policyId) => {
                policies.remove(policyId);
              });
            }
            // otherwise, grab the latest version of the note
            try {
              note = await notes.fetch(noteId, {
                force: true,
              });
            } catch (err) {
              if (
                err instanceof AuthorizationError ||
                err instanceof NotFoundError
              ) {
                notes.remove(noteId, { permanent: true });
                continue;
              }
            }
            // if the title changed then we need to update the collection also
            if (note && previousTitle !== note.title) {
              if (!event.collectionIds) {
                event.collectionIds = [];
              }
              const existing = find(event.collectionIds, {
                id: note.notebookId,
              });
              if (!existing && note.notebookId) {
                event.collectionIds.push({
                  id: note.notebookId,
                });
              }
            }
          }
        }
        if (event.collectionIds) {
          for (const notebookDescriptor of event.collectionIds) {
            const notebookId = notebookDescriptor.id;
            const notebook = notebooks.get(notebookId);
            // if we already have the latest version (it was us that performed
            // the change) then we don't need to update anything either.
            if (notebook?.updatedAt === notebookDescriptor.updatedAt) {
              continue;
            }
            if (!notebook?.notes) {
              continue;
            }
            if (event.invalidatedPolicies) {
              event.invalidatedPolicies.forEach((policyId) => {
                policies.remove(policyId);
              });
            }
            try {
              await notebook?.fetchNotes({
                force: true,
              });
            } catch (err) {
              if (
                err instanceof AuthorizationError ||
                err instanceof NotFoundError
              ) {
                memberships.removeAll({ notebookId });
                notebooks.remove(notebookId, { permanent: true });
                continue;
              }
            }
          }
        }
      })
    );
  };
}
function useNoteHandlers() {
  const {
    auth,
    notes,
    notebooks,
    policies,
    userMemberships,
    groupMemberships,
    groups,
  } = useStores();
  return (socket: SocketWithAuthentication) => {
    const currentUserId = auth?.user?.id;
    socket.on(
      "documents.update",
      action(
        (
          event: PartialExcept<Note, "id" | "title" | "url"> & {
            collectionId?: string | null;
          }
        ) => {
          notes.add(event);
          if (event.collectionId) {
            const notebook = notebooks.get(event.collectionId);
            notebook?.updateNote(event);
          }
        }
      )
    );
    socket.on(
      "documents.unpublish",
      action(
        (event: {
          document: PartialExcept<Note, "id">;
          collectionId: string;
        }) => {
          const note = event.document;
          // When the note is detached as part of unpublishing, only the owner should be able to view it.
          if (!note.notebookId && note.createdBy?.id !== currentUserId) {
            notes.remove(note.id, { permanent: true });
          } else {
            notes.add(note);
          }
          policies.remove(note.id);
          if (event.collectionId) {
            const notebook = notebooks.get(event.collectionId);
            notebook?.removeNote(note.id);
          }
        }
      )
    );
    socket.on(
      "documents.archive",
      action(
        (
          event: PartialExcept<Note, "id"> & { collectionId?: string | null }
        ) => {
          const model = notes.add(event);
          notes.addToArchive(model);
          if (event.collectionId) {
            const notebook = notebooks.get(event.collectionId);
            notebook?.removeNote(event.id);
          }
        }
      )
    );
    socket.on(
      "documents.delete",
      action(
        (
          event: PartialExcept<Note, "id"> & { collectionId?: string | null }
        ) => {
          notes.add(event);
          policies.remove(event.id);
          if (event.collectionId) {
            const notebook = notebooks.get(event.collectionId);
            notebook?.removeNote(event.id);
          }
          userMemberships.orderedData
            .filter((m) => m.noteId === event.id)
            .forEach((m) => userMemberships.remove(m.id));
        }
      )
    );
    socket.on(
      "documents.permanent_delete",
      (event: WebsocketEntityDeletedEvent) => {
        notes.remove(event.modelId, { permanent: true });
      }
    );
    socket.on(
      "documents.add_user",
      async (event: PartialExcept<UserMembership, "id">) => {
        const membership = userMemberships.add(event);
        if (event.userId === currentUserId) {
          invalidateChildPolicies(event.noteId!, { notes, policies });
        }
        try {
          // The event only references related models by ID, load any that are
          // not already in memory so that the membership can be displayed.
          await Promise.all([
            notes.fetch(event.noteId!, {
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
          invalidateChildPolicies(event.noteId!, { notes, policies });
        }
        const policy = policies.get(event.noteId!);
        if (policy && policy.abilities.read === false) {
          notes.remove(event.noteId!, { permanent: true });
        }
      }
    );
    socket.on(
      "documents.add_group",
      async (event: PartialExcept<GroupMembership, "id">) => {
        const membership = groupMemberships.add(event);
        const group = groups.get(event.groupId!);
        if (currentUserId && group?.users.some((u) => u.id === currentUserId)) {
          invalidateChildPolicies(event.noteId!, { notes, policies });
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
        const policy = policies.get(event.noteId!);
        if (policy && policy.abilities.read === false) {
          notes.remove(event.noteId!, { permanent: true });
        }
      }
    );
  };
}
function useNotebookHandlers() {
  const { auth, notebooks, notes, policies, memberships, groupMemberships } =
    useStores();
  return (socket: SocketWithAuthentication) => {
    const currentUserId = auth?.user?.id;
    socket.on("collections.create", (event: PartialExcept<Notebook, "id">) => {
      notebooks.add(event);
    });
    socket.on("collections.update", (event: PartialExcept<Notebook, "id">) => {
      notebooks.add(event);
    });
    socket.on(
      "collections.delete",
      action((event: WebsocketEntityDeletedEvent) => {
        const notebookId = event.modelId;
        const deletedAt = new Date().toISOString();
        const deletedNotes = notes.inNotebook(notebookId);
        deletedNotes.forEach((doc) => {
          if (!doc.publishedAt) {
            // draft is to be detached from collection, not deleted
            doc.notebookId = null;
          } else {
            doc.deletedAt = deletedAt;
          }
          policies.remove(doc.id);
        });
        memberships.removeAll({ notebookId });
        notebooks.remove(notebookId);
      })
    );
    socket.on(
      "collections.archive",
      async (event: PartialExcept<Notebook, "id">) => {
        const notebookId = event.id;
        // Fetch collection to update policies
        try {
          await notebooks.fetch(notebookId, { force: true });
        } catch (err) {
          Logger.error(
            "Failed to fetch collection after archive",
            toError(err)
          );
        }
        notes.unarchivedInNotebook(notebookId).forEach(
          action((doc) => {
            if (!doc.publishedAt) {
              // draft is to be detached from collection, not archived
              doc.notebookId = null;
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
      async (event: PartialExcept<Notebook, "id">) => {
        const notebookId = event.id;
        notes
          .archivedInNotebook(notebookId, {
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
          await notebooks.fetch(notebookId, { force: true });
        } catch (err) {
          Logger.error(
            "Failed to fetch collection after restore",
            toError(err)
          );
        }
      }
    );
    socket.on(
      "collections.add_user",
      async (event: Membership & { collectionId: string }) => {
        const membership = memberships.add({
          ...event,
          notebookId: event.collectionId,
        });
        try {
          // The event only references related models by ID, load any that are not
          // already in memory so that the membership can be displayed.
          await Promise.all([
            notebooks.fetch(event.collectionId, {
              force: event.userId === currentUserId,
            }),
            membership.loadRelations({ withoutPolicies: true }),
          ]);
        } catch (err) {
          Logger.error(
            "Failed to fetch collection after add_user",
            toError(err)
          );
        }
      }
    );
    socket.on(
      "collections.remove_user",
      async (event: Membership & { collectionId: string }) => {
        memberships.remove(event.id);
        if (event.userId === currentUserId) {
          await revokeNotebookAccess(event.collectionId, {
            notebooks,
            notes,
            memberships,
            policies,
          });
        }
      }
    );
    socket.on(
      "collections.add_group",
      async (event: GroupMembership & { collectionId: string }) => {
        const membership = groupMemberships.add({
          ...event,
          notebookId: event.collectionId,
        });
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
      }
    );
    socket.on(
      "collections.remove_group",
      async (event: GroupMembership & { collectionId: string }) => {
        groupMemberships.remove(event.id);
        // The event reaches everyone with access to the collection, so the policy
        // narrows it to those that may have held it through the group.
        const policy = policies.get(event.collectionId!);
        if (!policy || policy.abilities.read === false) {
          await revokeNotebookAccess(event.collectionId!, {
            notebooks,
            notes,
            memberships,
            policies,
          });
        }
      }
    );
    socket.on(
      "collections.revoke_access",
      async (event: WebsocketEntityDeletedEvent) =>
        revokeNotebookAccess(event.modelId, {
          notebooks,
          notes,
          memberships,
          policies,
        })
    );
    socket.on(
      "collections.update_index",
      action((event: WebsocketNotebookUpdateIndexEvent) => {
        const notebook = notebooks.get(event.collectionId);
        notebook?.updateIndex(event.index);
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
  const { auth, notes, policies } = useStores();
  return (socket: SocketWithAuthentication) => {
    socket.on("teams.update", (event: PartialExcept<Team, "id">) => {
      if ("sharing" in event && event.sharing !== auth.team?.sharing) {
        notes.all.forEach((note) => {
          policies.remove(note.id);
        });
      }
      auth.team?.updateData(event);
    });
  };
}
function useUserHandlers() {
  const { auth, users, userMemberships, notes, notebooks, policies } =
    useStores();
  return (socket: SocketWithAuthentication) => {
    socket.on("users.update", (event: PartialExcept<User, "id">) => {
      users.add(event);
    });
    // the current user's role changed, so their policies are invalid and the
    // set of accessible collections may have changed.
    const handleRoleChange = async (event: PartialExcept<User, "id">) => {
      if (event.id === auth.user?.id) {
        notes.all.forEach((note) => policies.remove(note.id));
        try {
          await notebooks.fetchAll();
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
  const registerNoteHandlers = useNoteHandlers();
  const registerNotebookHandlers = useNotebookHandlers();
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
      registerNoteHandlers(currentSocket);
      registerNotebookHandlers(currentSocket);
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
