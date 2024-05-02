import { m } from "framer-motion";
import { observer } from "mobx-react";
import { BackIcon, GroupIcon, LinkIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import Share from "~/models/Share";
import Avatar, { AvatarSize } from "~/components/Avatar/Avatar";
import ButtonSmall from "~/components/ButtonSmall";
import CopyToClipboard from "~/components/CopyToClipboard";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import InputSelectPermission from "~/components/InputSelectPermission";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { createAction } from "~/actions";
import { UserSection } from "~/actions/sections";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import useKeyDown from "~/hooks/useKeyDown";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { EmptySelectValue } from "~/types";
import { collectionPath, urlify } from "~/utils/routeHelpers";
import { Suggestions } from "../Document/Suggestions";
import { presence } from "../components";
import { ListItem } from "../components/ListItem";
import { SearchInput } from "../components/SearchInput";

type Props = {
  collection: Collection;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
};

function SharePopover({ collection, onRequestClose }: Props) {
  const theme = useTheme();
  const { collectionGroupMemberships, memberships } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const [query, setQuery] = React.useState("");
  const [picker, showPicker, hidePicker] = useBoolean();
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);
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
          try {
            // TODO
            setPendingIds([]);
            hidePicker();
            toast.success(t("Invitations sent"));
          } catch (err) {
            toast.error(t("Could not send invitations"));
          }
        },
      }),
    [collection, hidePicker, pendingIds, t]
  );

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
        {t("Invite")}
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
    <div>
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
          }
        />
        {collectionGroupMemberships
          .inCollection(collection.id)
          .map((membership) => (
            <ListItem
              key={membership.id}
              image={
                <Squircle color={theme.text} size={AvatarSize.Medium}>
                  <GroupIcon color={theme.background} size={16} />
                </Squircle>
              }
              title={membership.group.name}
              subtitle={t("{{ count }} member", {
                count: membership.group.memberCount,
              })}
              actions={
                <InputSelectPermission
                  style={{ margin: 0 }}
                  onChange={async (permission: CollectionPermission) => {
                    if (permission) {
                      await collectionGroupMemberships.create({
                        collectionId: collection.id,
                        groupId: membership.groupId,
                        permission,
                      });
                    } else {
                      await collectionGroupMemberships.delete({
                        collectionId: collection.id,
                        groupId: membership.groupId,
                      });
                    }
                  }}
                  disabled={!can.update}
                  value={membership.permission}
                  labelHidden
                  nude
                />
              }
            />
          ))}
        {memberships.inCollection(collection.id).map((membership) => (
          <ListItem
            key={membership.id}
            image={
              <Avatar
                model={membership.user}
                size={AvatarSize.Medium}
                showBorder={false}
              />
            }
            title={membership.user.name}
            subtitle={membership.user.email}
            actions={
              <InputMemberPermissionSelect
                style={{ margin: 0 }}
                permissions={[
                  {
                    label: t("Admin"),
                    value: CollectionPermission.Admin,
                  },
                  {
                    label: t("Can edit"),
                    value: CollectionPermission.ReadWrite,
                  },
                  {
                    label: t("View only"),
                    value: CollectionPermission.Read,
                  },
                  {
                    label: t("No access"),
                    value: EmptySelectValue,
                  },
                ]}
                onChange={async (permission: CollectionPermission) => {
                  if (permission) {
                    await memberships.create({
                      collectionId: collection.id,
                      userId: membership.userId,
                      permission,
                    });
                  } else {
                    await memberships.delete({
                      collectionId: collection.id,
                      userId: membership.userId,
                    });
                  }
                }}
                disabled={!can.update}
                value={membership.permission}
                labelHidden
                nude
              />
            }
          />
        ))}
      </div>
    </div>
  );
}

export default observer(SharePopover);
