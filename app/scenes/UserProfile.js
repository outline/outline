// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import { inject, observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { withRouter, type RouterHistory } from "react-router-dom";
import styled from "styled-components";
import { settings } from "shared/utils/routeHelpers";
import AuthStore from "stores/AuthStore";
import DocumentsStore from "stores/DocumentsStore";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Subheading from "components/Subheading";

type Props = {
  user: User,
  auth: AuthStore,
  documents: DocumentsStore,
  history: RouterHistory,
  onRequestClose: () => void,
};

function UserProfile(props: Props) {
  const { t } = useTranslation();
  const { user, auth, documents, ...rest } = props;
  if (!user) return null;
  const isCurrentUser = auth.user && auth.user.id === user.id;

  return (
    <Modal
      title={
        <Flex align="center">
          <Avatar src={user.avatarUrl} size={38} />
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
            time: distanceInWordsToNow(new Date(user.createdAt)),
          })}
          {user.isAdmin && (
            <StyledBadge admin={user.isAdmin}>{t("Admin")}</StyledBadge>
          )}
          {user.isSuspended && <Badge>{t("Suspended")}</Badge>}
          {isCurrentUser && (
            <Edit>
              <Button
                onClick={() => this.props.history.push(settings())}
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

export default inject("documents", "auth")(withRouter(observer(UserProfile)));
