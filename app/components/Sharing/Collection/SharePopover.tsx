import { observer } from "mobx-react";
import { GroupIcon, LinkIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import Share from "~/models/Share";
import Avatar, { AvatarSize } from "~/components/Avatar/Avatar";
import CopyToClipboard from "~/components/CopyToClipboard";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import InputSelectPermission from "~/components/InputSelectPermission";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { EmptySelectValue } from "~/types";
import { collectionPath, urlify } from "~/utils/routeHelpers";
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
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();

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

  const backButton = null;

  const rightButton = (
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
  );
}

export default observer(SharePopover);
