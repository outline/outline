// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, Trans } from "react-i18next";
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
};

@withTranslation()
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

    return (
      <>
        <Tooltip
          tooltip={
            <Centered>
              <Trans
                defaults="<strong>{{ userName }} {{ you }} <br /> {{ action }}</strong>"
                components={{
                  userName: user.name,
                  you: isCurrentUser && t("(You)"),
                  action: isPresent
                    ? isEditing
                      ? t("currently editing")
                      : t("currently viewing")
                    : t("viewed {{ timeAgo }} ago", {
                        timeAgo: distanceInWordsToNow(new Date(lastViewedAt)),
                      }),
                }}
              />
            </Centered>
          }
          placement="bottom"
        >
          <AvatarWrapper isPresent={isPresent}>
            <Avatar
              src={user.avatarUrl}
              onClick={this.handleOpenProfile}
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

export default AvatarWithPresence;
