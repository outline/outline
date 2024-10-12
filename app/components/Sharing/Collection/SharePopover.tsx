import { isEmail } from "class-validator";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import Group from "~/models/Group";
import User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
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
import { collectionPath, urlify } from "~/utils/routeHelpers";
import { Wrapper, presence } from "../components";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { PermissionAction } from "../components/PermissionAction";
import { SearchInput } from "../components/SearchInput";
import { Suggestions } from "../components/Suggestions";
import { AccessControlList } from "./AccessControlList";

type Props = {
  /** The collection to share. */
  collection: Collection;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
};

function SharePopover({ collection, visible, onRequestClose }: Props) {
  const team = useCurrentTeam();
  const { groupMemberships, users, groups, memberships } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const [query, setQuery] = React.useState("");
  const [picker, showPicker, hidePicker] = useBoolean();
  const [hasRendered, setHasRendered] = React.useState(visible);
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);
  const [invitedInSession, setInvitedInSession] = React.useState<string[]>([]);
  const [permission, setPermission] = React.useState<CollectionPermission>(
    CollectionPermission.Read
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
    if (visible) {
      setHasRendered(true);
    }
  }, [visible]);

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
                await memberships.create({
                  collectionId: collection.id,
                  userId: user.id,
                  permission,
                });
                return user;
              }

              if (group) {
                await groupMemberships.create({
                  collectionId: collection.id,
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

          // Special case for the common action of adding a single user.
          if (invitedUsers.length === 1 && invited.length === 1) {
            const user = invitedUsers[0];
            toast.message(
              t("{{ userName }} was added to the collection", {
                userName: user.name,
              }),
              {
                icon: <Avatar model={user} size={AvatarSize.Toast} />,
              }
            );
          } else if (invitedGroups.length === 1 && invited.length === 1) {
            const group = invitedGroups[0];
            toast.success(
              t("{{ userName }} was added to the collection", {
                userName: group.name,
              })
            );
          } else if (invitedGroups.length === 0) {
            toast.success(
              t("{{ count }} people added to the collection", {
                count: invitedUsers.length,
              })
            );
          } else {
            toast.success(
              t(
                "{{ count }} people and {{ count2 }} groups added to the collection",
                {
                  count: invitedUsers.length,
                  count2: invitedGroups.length,
                }
              )
            );
          }

          setInvitedInSession((prev) => [...prev, ...pendingIds]);
          setPendingIds([]);
          hidePicker();
        },
      }),
    [
      collection.id,
      groupMemberships,
      groups,
      hidePicker,
      memberships,
      pendingIds,
      permission,
      t,
      team.defaultUserRole,
      users,
    ]
  );

  const permissions = React.useMemo(
    () =>
      [
        {
          label: t("View only"),
          value: CollectionPermission.Read,
        },
        {
          label: t("Can edit"),
          value: CollectionPermission.ReadWrite,
        },
        {
          label: t("Manage"),
          value: CollectionPermission.Admin,
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
        onChange={(value: CollectionPermission) => setPermission(value)}
      />
    ) : null
  ) : (
    <CopyLinkButton
      key="copy-link"
      url={urlify(collectionPath(collection.path))}
      onCopy={onRequestClose}
    />
  );

  return (
    <Wrapper>
      {can.update && (
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
          query={query}
          collection={collection}
          pendingIds={pendingIds}
          addPendingId={handleAddPendingId}
          removePendingId={handleRemovePendingId}
          onEscape={handleEscape}
        />
      )}

      <div style={{ display: picker ? "none" : "block" }}>
        <AccessControlList
          collection={collection}
          invitedInSession={invitedInSession}
        />
      </div>
    </Wrapper>
  );
}

export default observer(SharePopover);
