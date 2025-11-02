import * as React from "react";
import styled from "styled-components";
import useBoolean from "~/hooks/useBoolean";
import Initials from "./Initials";
import Tooltip from "../Tooltip";

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
  name?: string;
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
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  /** Optional class name */
  className?: string;
  /** Optional style */
  style?: React.CSSProperties;
  /** Whether to show a tooltip */
  showTooltip?: boolean;
};

function Avatar(props: Props) {
  const {
    model,
    style,
    variant = AvatarVariant.Round,
    className,
    showTooltip,
    ...rest
  } = props;
  const src = props.src || model?.avatarUrl;
  const [error, handleError] = useBoolean(false);

  const content = (
    <Relative
      style={style}
      $variant={variant}
      $size={props.size}
      className={className}
    >
      {src && !error ? (
        <Image onError={handleError} src={src} {...rest} />
      ) : model ? (
        <Initials color={model.color} {...rest}>
          {model.initial?.toUpperCase()}
        </Initials>
      ) : (
        <Initials {...rest} />
      )}
    </Relative>
  );

  return showTooltip ? (
    <Tooltip content={props.alt || model?.name || ""}>{content}</Tooltip>
  ) : (
    content
  );
}

Avatar.defaultProps = {
  size: AvatarSize.Medium,
};

const Relative = styled.div<{ $variant: AvatarVariant; $size: AvatarSize }>`
  position: relative;
  user-select: none;
  flex-shrink: 0;
  border-radius: ${(props) =>
    props.$variant === AvatarVariant.Round ? "50%" : `${props.$size / 8}px`};
  overflow: hidden;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
`;

const Image = styled.img<{ size: number }>`
  display: block;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
`;

export default Avatar;
