import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { WithTranslation, withTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import User from "~/models/User";
import UserProfile from "~/scenes/UserProfile";
import Avatar from "~/components/Avatar";
import Tooltip from "~/components/Tooltip";

type Props = WithTranslation & {
  user: User;
  isPresent: boolean;
  isEditing: boolean;
  isObserving: boolean;
  isCurrentUser: boolean;
  profileOnClick: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
};

@observer
class AvatarWithPresence extends React.Component<Props> {
  @observable
  isOpen = false;

  handleOpenProfile = () => {
    this.isOpen = true;
  };

  handleCloseProfile = () => {
    this.isOpen = false;
  };

  render() {
    const {
      onClick,
      user,
      isPresent,
      isEditing,
      isObserving,
      isCurrentUser,
      t,
    } = this.props;
    const status = isPresent
      ? isEditing
        ? t("currently editing")
        : t("currently viewing")
      : t("previously edited");

    return (
      <>
        <Tooltip
          tooltip={
            <Centered>
              <strong>{user.name}</strong> {isCurrentUser && `(${t("You")})`}
              {status && (
                <>
                  <br />
                  {status}
                </>
              )}
            </Centered>
          }
          placement="bottom"
        >
          <AvatarWrapper
            $isPresent={isPresent}
            $isObserving={isObserving}
            $color={user.color}
          >
            <Avatar
              src={user.avatarUrl}
              onClick={
                this.props.profileOnClick === false
                  ? onClick
                  : this.handleOpenProfile
              }
              size={32}
            />
          </AvatarWrapper>
        </Tooltip>
        {this.props.profileOnClick && (
          <UserProfile
            user={user}
            isOpen={this.isOpen}
            onRequestClose={this.handleCloseProfile}
          />
        )}
      </>
    );
  }
}

const Centered = styled.div`
  text-align: center;
`;

const AvatarWrapper = styled.div<{
  $isPresent: boolean;
  $isObserving: boolean;
  $color: string;
}>`
  opacity: ${(props) => (props.$isPresent ? 1 : 0.5)};
  transition: opacity 250ms ease-in-out;
  border-radius: 50%;
  position: relative;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    transition: border-color 100ms ease-in-out;
    border: 2px solid transparent;
    pointer-events: none;

    ${(props) =>
      props.$isObserving &&
      css`
        border: 2px solid ${props.$color};
        box-shadow: inset 0 0 0 2px ${props.theme.background};

        &:hover {
          top: -1px;
          left: -1px;
          right: -1px;
          bottom: -1px;
        }
      `}
  }

  &:hover:after {
    border: 2px solid ${(props) => props.$color};
    box-shadow: inset 0 0 0 2px ${(props) => props.theme.background};
  }
`;

export default withTranslation()(AvatarWithPresence);
