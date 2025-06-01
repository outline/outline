import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";
import styled from "styled-components";
import Initials from "./Initials";

export enum AvatarSize {
  Small = 16,
  Toast = 18,
  Medium = 24,
  Large = 28,
  XLarge = 32,
  XXLarge = 48,
  Upload = 64,
}

export enum AvatarVariant {
  Round = "round",
  Square = "square",
}

export interface IAvatar {
  avatarUrl: string | null;
  color?: string;
  initial?: string;
  id?: string;
}

type Props = {
  /** The size of the avatar */
  size: AvatarSize;
  /** The variant of the avatar */
  variant?: AvatarVariant;
  /** The source of the avatar image, if not passing a model. */
  src?: string;
  /** The avatar model, if not passing a source. */
  model?: IAvatar;
  /** The alt text for the image */
  alt?: string;
  /** Optional click handler */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /** Optional class name */
  className?: string;
  /** Optional style */
  style?: React.CSSProperties;
};

function Avatar(props: Props) {
  const {
    model,
    style,
    variant = AvatarVariant.Round,
    className,
    onClick,
    alt,
    size,
  } = props;
  const src = props.src || model?.avatarUrl;

  return (
    <StyledAvatarRoot
      style={style}
      $variant={variant}
      $size={size}
      className={className}
      onClick={onClick}
    >
      {src && (
        <StyledAvatarImage
          src={src}
          alt={alt || (model ? `${model.initial || "User"} avatar` : "Avatar")}
          $size={size}
        />
      )}
      <StyledAvatarFallback $size={size}>
        {model ? (
          <Initials color={model.color} size={size}>
            {model.initial}
          </Initials>
        ) : (
          <Initials size={size} />
        )}
      </StyledAvatarFallback>
    </StyledAvatarRoot>
  );
}

Avatar.defaultProps = {
  size: AvatarSize.Medium,
};

const StyledAvatarRoot = styled(AvatarPrimitive.Root)<{
  $variant: AvatarVariant;
  $size: AvatarSize;
}>`
  position: relative;
  user-select: none;
  flex-shrink: 0;
  border-radius: ${(props) =>
    props.$variant === AvatarVariant.Round ? "50%" : `${props.$size / 8}px`};
  overflow: hidden;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const StyledAvatarImage = styled(AvatarPrimitive.Image)<{ $size: number }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
`;

const StyledAvatarFallback = styled(AvatarPrimitive.Fallback)<{
  $size: number;
}>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
`;

export default Avatar;
