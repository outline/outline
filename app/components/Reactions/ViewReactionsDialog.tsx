import compact from "lodash/compact";
import { observer } from "mobx-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { Tab, TabPanel, useTabState } from "reakit";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import { s, hover } from "@shared/styles";
import Comment from "~/models/Comment";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import PlaceholderText from "~/components/PlaceholderText";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  /** Model for which to show the reactions. */
  model: Comment;
};

const ViewReactionsDialog: React.FC<Props> = ({ model }) => {
  const { t } = useTranslation();
  const { users } = useStores();
  const tab = useTabState();
  const { reactedUsersLoaded } = model;

  React.useEffect(() => {
    const loadReactedUsersData = async () => {
      try {
        await model.loadReactedUsersData();
      } catch (err) {
        toast.error(t("Could not load reactions"));
      }
    };

    void loadReactedUsersData();
  }, [t, model]);

  if (!reactedUsersLoaded) {
    return <PlaceHolder />;
  }

  return (
    <>
      <TabActionsWrapper>
        {model.reactions.map((reaction) => (
          <StyledTab
            {...tab}
            key={reaction.emoji}
            id={reaction.emoji}
            aria-label={t("Reaction")}
            $active={tab.selectedId === reaction.emoji}
          >
            <Emoji size={16}>{reaction.emoji}</Emoji>
          </StyledTab>
        ))}
      </TabActionsWrapper>
      {model.reactions.map((reaction) => {
        const reactedUsers = compact(
          reaction.userIds.map((id) => users.get(id))
        );

        return (
          <StyledTabPanel {...tab} key={reaction.emoji}>
            {reactedUsers.map((user) => (
              <UserInfo key={user.name} align="center" gap={8}>
                <Avatar model={user} size={AvatarSize.Medium} />
                <Text size="medium">{user.name}</Text>
              </UserInfo>
            ))}
          </StyledTabPanel>
        );
      })}
    </>
  );
};

const PlaceHolder = React.memo(
  () => (
    <>
      <TabActionsWrapper gap={8} style={{ paddingBottom: "10px" }}>
        <PlaceholderText width={40} height={32} />
        <PlaceholderText width={40} height={32} />
      </TabActionsWrapper>
      <UserInfo align="center" gap={12}>
        <PlaceholderText width={AvatarSize.Medium} height={AvatarSize.Medium} />
        <PlaceholderText height={34} />
      </UserInfo>
      <UserInfo align="center" gap={12}>
        <PlaceholderText width={AvatarSize.Medium} height={AvatarSize.Medium} />
        <PlaceholderText height={34} />
      </UserInfo>
    </>
  ),
  () => true
);
PlaceHolder.displayName = "ViewReactionsPlaceholder";

const TabActionsWrapper = styled(Flex)`
  border-bottom: 1px solid ${s("inputBorder")};
`;

const StyledTab = styled(Tab)<{ $active: boolean }>`
  position: relative;
  font-weight: 500;
  font-size: 14px;
  cursor: var(--pointer);
  background: none;
  border: 0;
  border-radius: 4px 4px 0 0;
  padding: 8px 12px 10px;
  user-select: none;
  transition: background-color 100ms ease;

  &: ${hover} {
    background-color: ${s("listItemHoverBackground")};
  }

  ${({ $active }) =>
    $active &&
    css`
      &:after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: ${s("textSecondary")};
      }
    `}
`;

const StyledTabPanel = styled(TabPanel)`
  height: 300px;
  padding: 5px 0;
  overflow-y: auto;
`;

const UserInfo = styled(Flex)`
  padding: 10px 8px;
`;

export default observer(ViewReactionsDialog);
