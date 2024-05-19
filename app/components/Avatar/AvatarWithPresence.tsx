import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import Tooltip from "~/components/Tooltip";

type Props = {
  user: User;
  isPresent: boolean;
  isEditing: boolean;
  isObserving: boolean;
  isCurrentUser: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
};

function AvatarWithPresence({
  onClick,
  user,
  isPresent,
  isEditing,
  isObserving,
  isCurrentUser,
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
        <AvatarWrapper
          $isPresent={isPresent}
          $isObserving={isObserving}
          $color={user.color}
        >
          <Avatar model={user} onClick={onClick} size={32} />
        </AvatarWrapper>
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

const AvatarWrapper = styled.div<AvatarWrapperProps>`
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
