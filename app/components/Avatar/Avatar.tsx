import { observer } from "mobx-react";
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

export type AvatarProps = {
  /** The size of the avatar */
  size?: AvatarSize;
  /** The variant of the avatar */
  variant?: AvatarVariant;
  /** The source of the avatar image, if not passing a model. */
  src?: string;
  /** The avatar model, if not passing a source. */
  model?: IAvatar;
  /** The alt text for the image */
  alt?: string;
  /** Optional click handler */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Optional class name */
  className?: string;
  /** Optional style */
  style?: React.CSSProperties;
  /** Whether to show a tooltip */
  showTooltip?: boolean;
  /** Whether to show a profile card on hover for users, defaults to true */
  showHoverCard?: boolean;
} & Omit<
  React.ComponentPropsWithoutRef<"div">,
  "onClick" | "className" | "style"
>;

const Avatar = React.forwardRef(function Avatar_(
  props: AvatarProps,
  ref: React.Ref<HTMLDivElement>
) {
  const {
    model,
    style,
    variant = AvatarVariant.Round,
    size = AvatarSize.Medium,
    className,
    showTooltip,
    showHoverCard: _showHoverCard,
    src: srcProp,
    alt,
    onClick,
    ...rest
  } = props;
  const src = srcProp || model?.avatarUrl;
  const [error, handleError] = useBoolean(false);
  const initial =
    model?.initial || (model?.name ? model.name[0] : "").toUpperCase();

  const content = (
    <Relative
      ref={ref}
      style={style}
      $variant={variant}
      $size={size}
      className={className}
      {...rest}
    >
      {src && !error ? (
        <Image
          onError={handleError}
          onClick={onClick}
          src={src}
          alt={alt}
          size={size}
        />
      ) : (
        <Initials
          color={model?.color}
          onClick={onClick}
          aria-label={alt}
          size={size}
        >
          {model ? initial : null}
        </Initials>
      )}
    </Relative>
  );

  return showTooltip ? (
    <Tooltip content={alt || model?.name || ""}>{content}</Tooltip>
  ) : (
    content
  );
});

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

export default observer(Avatar);
