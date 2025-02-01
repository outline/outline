import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import User from "~/models/User";
import Tooltip from "~/components/Tooltip";
import Avatar, { AvatarSize } from "./Avatar";

type Props = {
  user: User;
  isPresent: boolean;
  isEditing: boolean;
  isObserving: boolean;
  isCurrentUser: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  size?: AvatarSize;
  style?: React.CSSProperties;
};

function AvatarWithPresence({
  onClick,
  user,
  isPresent,
  isEditing,
  isObserving,
  isCurrentUser,
  size = AvatarSize.Large,
  style,
}: Props) {
  const { t } = useTranslation();
  const status = isPresent
    ? isEditing
      ? t("currently editing")
      : t("currently viewing")
    : t("previously edited");

  return (
    <>
      <Tooltip
        content={
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
        <AvatarPresence
          $isPresent={isPresent}
          $isObserving={isObserving}
          $color={user.color}
          style={style}
        >
          <Avatar model={user} onClick={onClick} size={size} />
        </AvatarPresence>
      </Tooltip>
    </>
  );
}

const Centered = styled.div`
  text-align: center;
`;

type AvatarWrapperProps = {
  $isPresent: boolean;
  $isObserving: boolean;
  $color: string;
};

const AvatarPresence = styled.div<AvatarWrapperProps>`
  opacity: ${(props) => (props.$isPresent ? 1 : 0.5)};
  transition: opacity 250ms ease-in-out;
  border-radius: 50%;
  position: relative;

  ${(props) =>
    props.$isPresent &&
    css<AvatarWrapperProps>`
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
        box-shadow: inset 0 0 0 2px ${s("background")};
      }
    `}
`;

export default observer(AvatarWithPresence);
