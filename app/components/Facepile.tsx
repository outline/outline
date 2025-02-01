import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
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
  size = AvatarSize.Large,
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
      {users
        .filter(Boolean)
        .slice(0, limit)
        .map((user, index) => (
          <AvatarWrapper
            style={
              index === 0 && overflow <= 0
                ? undefined
                : { clipPath: "url(#facepile)" }
            }
            key={user.id}
          >
            {renderAvatar(user)}
          </AvatarWrapper>
        ))}
      <FacepileClip />
    </Avatars>
  );
}

function DefaultAvatar(user: User) {
  return <Avatar model={user} size={AvatarSize.Large} />;
}

function FacepileClip() {
  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0 }}
      width="25"
      height="28"
      viewBox="0 0 25 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id="facepile">
        <path d="M14.0633 0.5C18.1978 0.5 21.8994 2.34071 24.3876 5.24462C22.8709 7.81315 22.0012 10.8061 22.0012 14C22.0012 17.1939 22.8709 20.1868 24.3876 22.7554C21.8994 25.6593 18.1978 27.5 14.0633 27.5C6.57035 27.5 0.5 21.4537 0.5 14C0.5 6.54628 6.57035 0.5 14.0633 0.5Z" />
      </clipPath>
    </svg>
  );
}

const AvatarWrapper = styled.div`
  position: relative;
  margin-right: -4px;

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
  background: ${(props) => props.theme.textTertiary};
  color: ${s("white")};
  text-align: center;
  font-size: 12px;
  font-weight: 600;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
  cursor: var(--pointer);
`;

export default observer(Facepile);
