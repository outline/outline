// @flow
import { formatDistanceToNow } from "date-fns";
import { observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Subheading from "components/Subheading";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";
import { settingsPath } from "utils/routeHelpers";

type Props = {|
  user: User,
  onRequestClose: () => void,
|};

function UserProfile(props: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const currentUser = useCurrentUser();
  const history = useHistory();
  const { user, ...rest } = props;

  if (!user) return null;
  const isCurrentUser = currentUser.id === user.id;

  return (
    <Modal
      title={
        <Flex align="center">
          <Avatar src={user.avatarUrl} size={38} alt={t("Profile picture")} />
          <span>&nbsp;{user.name}</span>
        </Flex>
      }
      {...rest}
    >
      <Flex column>
        <Meta>
          {isCurrentUser
            ? t("You joined")
            : user.lastActiveAt
            ? t("Joined")
            : t("Invited")}{" "}
          {t("{{ time }} ago.", {
            time: formatDistanceToNow(Date.parse(user.createdAt)),
          })}
          {user.isAdmin && (
            <StyledBadge primary={user.isAdmin}>{t("Admin")}</StyledBadge>
          )}
          {user.isSuspended && <StyledBadge>{t("Suspended")}</StyledBadge>}
          {isCurrentUser && (
            <Edit>
              <Button
                onClick={() => history.push(settingsPath())}
                icon={<EditIcon />}
                neutral
              >
                {t("Edit Profile")}
              </Button>
            </Edit>
          )}
        </Meta>
        <PaginatedDocumentList
          documents={documents.createdByUser(user.id)}
          fetch={documents.fetchOwned}
          options={{ user: user.id }}
          heading={<Subheading>{t("Recently updated")}</Subheading>}
          empty={
            <HelpText>
              {t("{{ userName }} hasn’t updated any documents yet.", {
                userName: user.name,
              })}
            </HelpText>
          }
          showCollection
        />
      </Flex>
    </Modal>
  );
}

const Edit = styled.span`
  position: absolute;
  top: 46px;
  right: 0;
`;

const StyledBadge = styled(Badge)`
  position: relative;
  top: -2px;
`;

const Meta = styled(HelpText)`
  margin-top: -12px;
`;

export default observer(UserProfile);
