import { observer } from "mobx-react";
import { MoreIcon, QuestionMarkIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { CollectionPermission, IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import Avatar from "../../Avatar";
import { AvatarSize } from "../../Avatar/Avatar";
import CollectionIcon from "../../Icons/CollectionIcon";
import Tooltip from "../../Tooltip";
import { ListItem } from "../components/ListItem";

type Props = {
  /** The document being shared. */
  document: Document;
  children: React.ReactNode;
};

export const OtherAccess = observer(({ document, children }: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const collection = document.collection;
  const usersInCollection = useUsersInCollection(collection);
  const user = useCurrentUser();

  return (
    <>
      {collection ? (
        <>
          {collection.permission ? (
            <ListItem
              image={
                <Squircle color={theme.accent} size={AvatarSize.Medium}>
                  <UserIcon color={theme.accentText} size={16} />
                </Squircle>
              }
              title={t("All members")}
              subtitle={t("Everyone in the workspace")}
              actions={
                <AccessTooltip>
                  {collection?.permission === CollectionPermission.ReadWrite
                    ? t("Can edit")
                    : t("Can view")}
                </AccessTooltip>
              }
            />
          ) : usersInCollection ? (
            <ListItem
              image={<CollectionSquircle collection={collection} />}
              title={collection.name}
              subtitle={t("Everyone in the collection")}
              actions={<AccessTooltip>{t("Can view")}</AccessTooltip>}
            />
          ) : (
            <ListItem
              image={<Avatar model={user} showBorder={false} />}
              title={user.name}
              subtitle={t("You have full access")}
              actions={<AccessTooltip>{t("Can edit")}</AccessTooltip>}
            />
          )}
          {children}
        </>
      ) : document.isDraft ? (
        <>
          <ListItem
            image={<Avatar model={document.createdBy} showBorder={false} />}
            title={document.createdBy?.name}
            actions={
              <AccessTooltip content={t("Created the document")}>
                {t("Can edit")}
              </AccessTooltip>
            }
          />
          {children}
        </>
      ) : (
        <>
          {children}
          <ListItem
            image={
              <Squircle color={theme.accent} size={AvatarSize.Medium}>
                <MoreIcon color={theme.accentText} size={16} />
              </Squircle>
            }
            title={t("Other people")}
            subtitle={t("Other workspace members may have access")}
            actions={
              <AccessTooltip
                content={t(
                  "This document may be shared with more workspace members through a parent document or collection you do not have access to"
                )}
              />
            }
          />
        </>
      )}
    </>
  );
});

const AccessTooltip = ({
  children,
  content,
}: {
  children?: React.ReactNode;
  content?: string;
}) => {
  const { t } = useTranslation();

  return (
    <Flex align="center" gap={2}>
      <Text type="secondary" size="small">
        {children}
      </Text>
      <Tooltip content={content ?? t("Access inherited from collection")}>
        <QuestionMarkIcon size={18} />
      </Tooltip>
    </Flex>
  );
};

const CollectionSquircle = ({ collection }: { collection: Collection }) => {
  const theme = useTheme();
  const iconType = determineIconType(collection.icon)!;
  const squircleColor =
    iconType === IconType.Outline ? collection.color! : theme.slateLight;
  const iconSize = iconType === IconType.Outline ? 16 : 22;

  return (
    <Squircle color={squircleColor} size={AvatarSize.Medium}>
      <CollectionIcon
        collection={collection}
        color={theme.white}
        size={iconSize}
      />
    </Squircle>
  );
};

function useUsersInCollection(collection?: Collection) {
  const { users, memberships } = useStores();
  const { request } = useRequest(() =>
    memberships.fetchPage({ limit: 1, id: collection!.id })
  );

  React.useEffect(() => {
    if (collection && !collection.permission) {
      void request();
    }
  }, [collection]);

  return collection
    ? collection.permission
      ? true
      : users.inCollection(collection.id).length > 1
    : false;
}
