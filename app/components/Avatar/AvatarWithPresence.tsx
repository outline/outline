import { observer } from "mobx-react";
import { EditIcon, EyeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import User from "~/models/User";
import Tooltip from "~/components/Tooltip";
import { UserHoverCard } from "~/components/UserHoverCard";
import Avatar, { AvatarSize } from "./Avatar";

/**
 * Props for the AvatarWithPresence component
 */
type Props = {
  /** The user to display the avatar for */
  user: User;
  /** Whether the user is currently present in the document */
  isPresent: boolean;
  /** Whether the user is currently editing the document */
  isEditing: boolean;
  /** Whether the user is currently observing the document */
  isObserving: boolean;
  /** Whether this avatar represents the current user */
  isCurrentUser: boolean;
  /** Optional click handler for the avatar */
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  /** Size of the avatar, defaults to AvatarSize.Large */
  size?: AvatarSize;
  /** Optional alt text for the avatar image */
  alt?: string;
  /** Optional inline styles to apply to the avatar wrapper */
  style?: React.CSSProperties;
};

/**
 * AvatarWithPresence component displays a user's avatar with visual indicators
 * for their current status (present, editing, observing).
 *
 * The component shows different visual states:
 * - Present users have full opacity
 * - Non-present users have reduced opacity
 * - Observing users have a colored border matching their user color
 * - Hovering shows a colored border
 *
 * A profile card on hover displays the user's name and current status.
 *
 * @param props - Component properties
 * @returns React component
 */
function AvatarWithPresence({
  onClick,
  user,
  isPresent,
  isEditing,
  isObserving,
  isCurrentUser,
  size = AvatarSize.Large,
  style,
  alt,
}: Props) {
  const { t } = useTranslation();
  const { name } = user;
  const status = isPresent
    ? isEditing
      ? t("currently editing")
      : t("currently viewing")
    : t("previously edited");

  const avatar = (
    <AvatarPresence
      $isPresent={isPresent}
      $isObserving={isObserving}
      $color={user.color}
      style={style}
    >
      <Avatar model={user} onClick={onClick} size={size} alt={alt} />
    </AvatarPresence>
  );

  // The facepile overflow badge is rendered with a placeholder in place of a
  // real user, there's no profile to show for it.
  if (!(user instanceof User)) {
    return (
      <Tooltip content={<Centered>{name}</Centered>} placement="bottom">
        {avatar}
      </Tooltip>
    );
  }

  return (
    <UserHoverCard
      user={user}
      side="bottom"
      info={
        <>
          {isPresent && !isEditing ? (
            <EyeIcon size={18} />
          ) : (
            <EditIcon size={18} />
          )}
          <span>
            {status}
            {isCurrentUser && ` (${t("You")})`}
          </span>
        </>
      }
    >
      {avatar}
    </UserHoverCard>
  );
}

const Centered = styled.div`
  text-align: center;
`;

/**
 * Props for the AvatarPresence styled component
 */
type AvatarWrapperProps = {
  /** Whether the user is currently present */
  $isPresent: boolean;
  /** Whether the user is currently observing */
  $isObserving: boolean;
  /** The user's color for border highlighting */
  $color: string;
};

/**
 * Styled component that wraps the Avatar and provides visual indicators
 * for the user's presence status.
 *
 * - Adjusts opacity based on presence
 * - Adds colored borders for observing users
 * - Handles hover effects
 */
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
