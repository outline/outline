import { isEmail } from "class-validator";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { BackIcon, LinkIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { CollectionPermission, UserRole } from "@shared/types";
import Collection from "~/models/Collection";
import Group from "~/models/Group";
import Share from "~/models/Share";
import User from "~/models/User";
import Avatar, { AvatarSize } from "~/components/Avatar/Avatar";
import ButtonSmall from "~/components/ButtonSmall";
import CopyToClipboard from "~/components/CopyToClipboard";
import InputSelectPermission from "~/components/InputSelectPermission";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { createAction } from "~/actions";
import { UserSection } from "~/actions/sections";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useKeyDown from "~/hooks/useKeyDown";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { collectionPath, urlify } from "~/utils/routeHelpers";
import { Wrapper, presence } from "../components";
import { ListItem } from "../components/ListItem";
import { SearchInput } from "../components/SearchInput";
import { Suggestions } from "../components/Suggestions";
import CollectionMemberList from "./CollectionMemberList";

type Props = {
  collection: Collection;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
};

function SharePopover({ collection, visible, onRequestClose }: Props) {
  const theme = useTheme();
  const team = useCurrentTeam();
  const { collectionGroupMemberships, users, groups, memberships } =
    useStores();
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const [query, setQuery] = React.useState("");
  const [picker, showPicker, hidePicker] = useBoolean();
  const [hasRendered, setHasRendered] = React.useState(visible);
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);
  const [invitedInSession, setInvitedInSession] = React.useState<string[]>([]);
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();
  const context = useActionContext();

  useKeyDown(
    "Escape",
    (ev) => {
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

  const handleCopied = React.useCallback(() => {
    onRequestClose();

    timeout.current = setTimeout(() => {
      toast.message(t("Link copied to clipboard"));
    }, 100);

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, [onRequestClose, t]);

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
                  permission:
                    user.role === UserRole.Viewer ||
                    user.role === UserRole.Guest
                      ? CollectionPermission.Read
                      : CollectionPermission.ReadWrite,
                });
                return user;
              }

              if (group) {
                await collectionGroupMemberships.create({
                  collectionId: collection.id,
                  groupId: group.id,
                  permission: CollectionPermission.Read,
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
      hidePicker,
      memberships,
      pendingIds,
      t,
      team.defaultUserRole,
      users,
    ]
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
      <ButtonSmall action={inviteAction} context={context} key="invite">
        {t("Add")}
      </ButtonSmall>
    ) : null
  ) : (
    <Tooltip
      content={t("Copy link")}
      delay={500}
      placement="top"
      key="copy-link"
    >
      <CopyToClipboard
        text={urlify(collectionPath(collection.path))}
        onCopy={handleCopied}
      >
        <NudeButton type="button">
          <LinkIcon size={20} />
        </NudeButton>
      </CopyToClipboard>
    </Tooltip>
  );

  return (
    <Wrapper>
      {can.update && (
        <SearchInput
          onChange={handleQuery}
          onClick={showPicker}
          query={query}
          back={backButton}
          action={rightButton}
        />
      )}

      {picker && (
        <div>
          <Suggestions
            query={query}
            collection={collection}
            pendingIds={pendingIds}
            addPendingId={handleAddPendingId}
            removePendingId={handleRemovePendingId}
          />
        </div>
      )}

      <div style={{ display: picker ? "none" : "block" }}>
        <ListItem
          image={
            <Squircle color={theme.accent} size={AvatarSize.Medium}>
              <UserIcon color={theme.accentText} size={16} />
            </Squircle>
          }
          title={t("All members")}
          subtitle={t("Everyone in the workspace")}
          actions={
            <div style={{ marginRight: -8 }}>
              <InputSelectPermission
                style={{ margin: 0 }}
                onChange={(permission) => {
                  void collection.save({ permission });
                }}
                disabled={!can.update}
                value={collection?.permission}
                labelHidden
                nude
              />
            </div>
          }
        />

        <CollectionMemberList
          collection={collection}
          invitedInSession={invitedInSession}
        />
      </div>
    </Wrapper>
  );
}

export default observer(SharePopover);
