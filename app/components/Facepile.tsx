import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Flex from "~/components/Flex";

type Props = {
  users: User[];
  size?: number;
  overflow?: number;
  limit?: number;
  renderAvatar?: (user: User) => React.ReactNode;
};

function Facepile({
  users,
  overflow = 0,
  size = 32,
  limit = 8,
  renderAvatar = DefaultAvatar,
  ...rest
}: Props) {
  return (
    <Avatars {...rest}>
      {overflow > 0 && (
        <More size={size}>
          <span>
            {users.length ? "+" : ""}
            {overflow}
          </span>
        </More>
      )}
      {users.slice(0, limit).map((user) => (
        <AvatarWrapper key={user.id}>{renderAvatar(user)}</AvatarWrapper>
      ))}
    </Avatars>
  );
}

function DefaultAvatar(user: User) {
  return <Avatar model={user} size={32} />;
}

const AvatarWrapper = styled.div`
  margin-right: -8px;

  &:first-child {
    margin-right: 0;
  }
`;

const More = styled.div<{ size: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 100%;
  background: ${(props) => props.theme.slate};
  color: ${s("text")};
  border: 2px solid ${s("background")};
  text-align: center;
  font-size: 11px;
  font-weight: 600;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
  cursor: var(--pointer);
`;

export default observer(Facepile);
