// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import styled from "styled-components";
import User from "models/User";
import UserProfile from "scenes/UserProfile";
import Avatar from "components/Avatar";
import Tooltip from "components/Tooltip";

type Props = {
  user: User,
  isPresent: boolean,
  isEditing: boolean,
  isCurrentUser: boolean,
  lastViewedAt: string,
  profileOnClick: boolean,
  t: TFunction,
};

@observer
class AvatarWithPresence extends React.Component<Props> {
  @observable isOpen: boolean = false;

  handleOpenProfile = () => {
    this.isOpen = true;
  };

  handleCloseProfile = () => {
    this.isOpen = false;
  };

  render() {
    const {
      user,
      lastViewedAt,
      isPresent,
      isEditing,
      isCurrentUser,
      t,
    } = this.props;

    const action = isPresent
      ? isEditing
        ? t("currently editing")
        : t("currently viewing")
      : t("viewed {{ timeAgo }} ago", {
          timeAgo: distanceInWordsToNow(new Date(lastViewedAt)),
        });

    return (
      <>
        <Tooltip
          tooltip={
            <Centered>
              <strong>{user.name}</strong> {isCurrentUser && `(${t("You")})`}
              <br />
              {action}
            </Centered>
          }
          placement="bottom"
        >
          <AvatarWrapper isPresent={isPresent}>
            <Avatar
              src={user.avatarUrl}
              onClick={
                this.props.profileOnClick === false
                  ? undefined
                  : this.handleOpenProfile
              }
              size={32}
              icon={isEditing ? <EditIcon size={16} color="#FFF" /> : undefined}
            />
          </AvatarWrapper>
        </Tooltip>
        <UserProfile
          user={user}
          isOpen={this.isOpen}
          onRequestClose={this.handleCloseProfile}
        />
      </>
    );
  }
}

const Centered = styled.div`
  text-align: center;
`;

const AvatarWrapper = styled.div`
  opacity: ${(props) => (props.isPresent ? 1 : 0.5)};
  transition: opacity 250ms ease-in-out;
`;

export default withTranslation()<AvatarWithPresence>(AvatarWithPresence);
