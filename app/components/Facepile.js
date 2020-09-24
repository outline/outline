// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import styled, { withTheme } from "styled-components";
import { MAX_AVATAR_DISPLAY } from "shared/constants";
import User from "models/User";
import Avatar from "components/Avatar";
import { DropdownMenu } from "components/DropdownMenu";
import Flex from "components/Flex";

type Props = {
  users: User[],
  otherUsers?: User[],
  size?: number,
  overflow: number,
  renderAvatar: (user: User) => React.Node,
};

@observer
class Facepile extends React.Component<Props> {
  @observable isOpen: boolean = false;
  node: ?HTMLElement;

  componentDidMount() {
    window.addEventListener("click", this.handleClickOutside);
  }

  componentWillUnmount() {
    window.removeEventListener("click", this.handleClickOutside);
  }

  handleOpen = () => {
    this.isOpen = true;
  };

  handleClose = () => {
    this.isOpen = false;
  };

  handleClickOutside = (ev: SyntheticMouseEvent<>) => {
    // $FlowFixMe
    if (ev.target && this.node && this.node.contains(ev.target)) {
      return;
    }

    this.handleClose();
  };

  renderOverflowItem = () => {
    const {
      otherUsers,
      overflow,
      size = 32,
      renderAvatar = renderDefaultAvatar,
    } = this.props;

    const moreElement = (
      <More size={size}>
        <span>+{overflow}</span>
      </More>
    );

    if (!overflow) {
      return null;
    }

    if (!otherUsers) {
      return moreElement;
    }

    return (
      <div ref={(ref) => (this.node = ref)}>
        <DropdownMenu
          onOpen={this.handleOpen}
          label={moreElement}
          style={{
            minWidth: `calc(${size}px + 1em)`,
            padding: "0.5em",
            overflow: "initial",
          }}
        >
          <MenuWrapper>
            {otherUsers.map((user) => (
              <MenuItem key={user.id}>{renderAvatar(user)}</MenuItem>
            ))}
          </MenuWrapper>
        </DropdownMenu>
      </div>
    );
  };

  render() {
    const { users, renderAvatar = renderDefaultAvatar, ...rest } = this.props;

    return (
      <Avatars {...rest}>
        {this.renderOverflowItem()}
        {users.map((user) => (
          <AvatarWrapper key={user.id}>{renderAvatar(user)}</AvatarWrapper>
        ))}
      </Avatars>
    );
  }
}

function renderDefaultAvatar(user: User) {
  return <Avatar user={user} src={user.avatarUrl} size={32} />;
}

const MenuWrapper = styled.div`
  display: flex;
  max-width: calc(${(MAX_AVATAR_DISPLAY + 1) * 24}px + 0.5em);
  flex-wrap: wrap;
`;

const MenuItem = styled.div`
  margin-right: -8px;
`;

const AvatarWrapper = styled.div`
  margin-right: -8px;

  &:first-child {
    margin-right: 0;
  }
`;

const More = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 100%;
  background: ${(props) => props.theme.slate};
  color: ${(props) => props.theme.text};
  border: 2px solid ${(props) => props.theme.background};
  text-align: center;
  font-size: 11px;
  font-weight: 600;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
  cursor: pointer;
`;

export default inject("views", "presence")(withTheme(Facepile));
