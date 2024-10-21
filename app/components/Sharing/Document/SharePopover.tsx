import { isEmail } from "class-validator";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DocumentPermission } from "@shared/types";
import Document from "~/models/Document";
import Group from "~/models/Group";
import User from "~/models/User";
import { Avatar, GroupAvatar, AvatarSize } from "~/components/Avatar";
import NudeButton from "~/components/NudeButton";
import { createAction } from "~/actions";
import { UserSection } from "~/actions/sections";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useKeyDown from "~/hooks/useKeyDown";
import usePolicy from "~/hooks/usePolicy";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import { Permission } from "~/types";
import { documentPath, urlify } from "~/utils/routeHelpers";
import { Wrapper, presence } from "../components";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { PermissionAction } from "../components/PermissionAction";
import { SearchInput } from "../components/SearchInput";
import { Suggestions } from "../components/Suggestions";
import { AccessControlList } from "./AccessControlList";

type Props = {
  /** The document to share. */
  document: Document;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
};

function SharePopover({ document, onRequestClose, visible }: Props) {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const can = usePolicy(document);
  const { shares } = useStores();
  const share = shares.getByDocumentId(document.id);
  const sharedParent = shares.getByDocumentParents(document.id);
  const [hasRendered, setHasRendered] = React.useState(visible);
  const { users, userMemberships, groups, groupMemberships } = useStores();
  const [query, setQuery] = React.useState("");
  const [picker, showPicker, hidePicker] = useBoolean();
  const [invitedInSession, setInvitedInSession] = React.useState<string[]>([]);
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);
  const [permission, setPermission] = React.useState<DocumentPermission>(
    DocumentPermission.Read
  );

  const prevPendingIds = usePrevious(pendingIds);

  const suggestionsRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  useKeyDown(
    "Escape",
    (ev) => {
      if (!visible) {
        return;
      }
      ev.preventDefault();
      ev.stopImmediatePropagation();

      if (picker) {
        hidePicker();
      } else {
        onRequestClose();
      }
    },
    {
      allowInInput: true,
    }
  );

  // Fetch sharefocus the link button when the popover is opened
  React.useEffect(() => {
    if (visible) {
      void document.share();
      setHasRendered(true);
    }
  }, [document, hidePicker, visible]);

  // Hide the picker when the popover is closed
  React.useEffect(() => {
    if (visible) {
      setPendingIds([]);
      hidePicker();
    }
  }, [hidePicker, visible]);

  // Clear the query when picker is closed
  React.useEffect(() => {
    if (!picker) {
      setQuery("");
    }
  }, [picker]);

  React.useEffect(() => {
    if (prevPendingIds && pendingIds.length > prevPendingIds.length) {
      setQuery("");
      searchInputRef.current?.focus();
    } else if (prevPendingIds && pendingIds.length < prevPendingIds.length) {
      const firstPending = suggestionsRef.current?.firstElementChild;

      if (firstPending) {
        (firstPending as HTMLAnchorElement).focus();
      }
    }
  }, [pendingIds, prevPendingIds]);

  const inviteAction = React.useMemo(
    () =>
      createAction({
        name: t("Invite"),
        section: UserSection,
        perform: async () => {
          const invited = await Promise.all(
            pendingIds.map(async (idOrEmail) => {
              let user, group;

              // convert email to user
              if (isEmail(idOrEmail)) {
                const response = await users.invite([
                  {
                    email: idOrEmail,
                    name: idOrEmail,
                    role: team.defaultUserRole,
                  },
                ]);
                user = response[0];
              } else {
                user = users.get(idOrEmail);
                group = groups.get(idOrEmail);
              }

              if (user) {
                await userMemberships.create({
                  documentId: document.id,
                  userId: user.id,
                  permission,
                });
                return user;
              }

              if (group) {
                await groupMemberships.create({
                  documentId: document.id,
                  groupId: group.id,
                  permission,
                });
                return group;
              }

              return;
            })
          );

          const invitedUsers = invited.filter(
            (item) => item instanceof User
          ) as User[];
          const invitedGroups = invited.filter(
            (item) => item instanceof Group
          ) as Group[];

          if (invitedUsers.length > 0) {
            // Special case for the common action of adding a single user.
            if (invitedUsers.length === 1) {
              const user = invitedUsers[0];
              toast.message(
                t("{{ userName }} was added to the document", {
                  userName: user.name,
                }),
                {
                  icon: <Avatar model={user} size={AvatarSize.Toast} />,
                }
              );
            } else {
              toast.message(
                t("{{ count }} people added to the document", {
                  count: invitedUsers.length,
                })
              );
            }
          }
          if (invitedGroups.length > 0) {
            // Special case for the common action of adding a single group.
            if (invitedGroups.length === 1) {
              const group = invitedGroups[0];
              toast.message(
                t("{{ userName }} was added to the document", {
                  userName: group.name,
                }),
                {
                  icon: <GroupAvatar group={group} size={AvatarSize.Toast} />,
                }
              );
            } else {
              toast.message(
                t("{{ count }} groups added to the document", {
                  count: invitedGroups.length,
                })
              );
            }
          }

          setInvitedInSession((prev) => [...prev, ...pendingIds]);
          setPendingIds([]);
          hidePicker();
        },
      }),
    [
      document.id,
      groupMemberships,
      groups,
      hidePicker,
      userMemberships,
      pendingIds,
      permission,
      t,
      team.defaultUserRole,
      users,
    ]
  );

  const handleQuery = React.useCallback(
    (event) => {
      showPicker();
      setQuery(event.target.value);
    },
    [showPicker, setQuery]
  );

  const handleAddPendingId = React.useCallback(
    (id: string) => {
      setPendingIds((prev) => [...prev, id]);
    },
    [setPendingIds]
  );

  const handleRemovePendingId = React.useCallback(
    (id: string) => {
      setPendingIds((prev) => prev.filter((i) => i !== id));
    },
    [setPendingIds]
  );

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.nativeEvent.isComposing) {
        return;
      }
      if (ev.key === "ArrowDown" && !ev.shiftKey) {
        ev.preventDefault();

        if (ev.currentTarget.value) {
          const length = ev.currentTarget.value.length;
          const selectionStart = ev.currentTarget.selectionStart || 0;
          if (selectionStart < length) {
            ev.currentTarget.selectionStart = length;
            ev.currentTarget.selectionEnd = length;
            return;
          }
        }

        const firstSuggestion = suggestionsRef.current?.firstElementChild;

        if (firstSuggestion) {
          (firstSuggestion as HTMLAnchorElement).focus();
        }
      }
    },
    []
  );

  const handleEscape = React.useCallback(
    () => searchInputRef.current?.focus(),
    []
  );

  const permissions = React.useMemo(
    () =>
      [
        {
          label: t("View only"),
          value: DocumentPermission.Read,
        },
        {
          label: t("Can edit"),
          value: DocumentPermission.ReadWrite,
        },
        {
          label: t("Manage"),
          value: DocumentPermission.Admin,
        },
      ] as Permission[],
    [t]
  );

  if (!hasRendered) {
    return null;
  }

  const backButton = (
    <>
      {picker && (
        <NudeButton
          key="back"
          as={m.button}
          {...presence}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            hidePicker();
          }}
        >
          <BackIcon />
        </NudeButton>
      )}
    </>
  );

  const rightButton = picker ? (
    pendingIds.length ? (
      <PermissionAction
        key="invite"
        permission={permission}
        permissions={permissions}
        action={inviteAction}
        onChange={(value: DocumentPermission) => setPermission(value)}
      />
    ) : null
  ) : (
    <CopyLinkButton
      key="copy-link"
      url={urlify(documentPath(document))}
      onCopy={onRequestClose}
    />
  );

  return (
    <Wrapper>
      {can.manageUsers && (
        <SearchInput
          ref={searchInputRef}
          onChange={handleQuery}
          onClick={showPicker}
          onKeyDown={handleKeyDown}
          query={query}
          back={backButton}
          action={rightButton}
        />
      )}

      {picker && (
        <Suggestions
          ref={suggestionsRef}
          document={document}
          query={query}
          pendingIds={pendingIds}
          addPendingId={handleAddPendingId}
          removePendingId={handleRemovePendingId}
          onEscape={handleEscape}
        />
      )}

      <div style={{ display: picker ? "none" : "block" }}>
        <AccessControlList
          document={document}
          invitedInSession={invitedInSession}
          share={share}
          sharedParent={sharedParent}
          visible={visible}
          onRequestClose={onRequestClose}
        />
      </div>
    </Wrapper>
  );
}

export default observer(SharePopover);
