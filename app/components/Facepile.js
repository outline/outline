// @flow
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import User from "models/User";
import Avatar from "components/Avatar";
import Flex from "components/Flex";

type Props = {|
  users: User[],
  size?: number,
  overflow: number,
  onClick?: (event: SyntheticEvent<>) => mixed,
  renderAvatar?: (user: User) => React.Node,
|};

function Facepile({
  users,
  overflow,
  size = 32,
  renderAvatar = DefaultAvatar,
  ...rest
}: Props) {
  return (
    <Avatars {...rest}>
      {overflow > 0 && (
        <More size={size}>
          <span>+{overflow}</span>
        </More>
      )}
      {users.map((user) => (
        <AvatarWrapper key={user.id}>{renderAvatar(user)}</AvatarWrapper>
      ))}
    </Avatars>
  );
}

function DefaultAvatar(user: User) {
  return <Avatar user={user} src={user.avatarUrl} size={32} />;
}

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

export default observer(Facepile);
