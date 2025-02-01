import * as React from "react";
import styled from "styled-components";
import useBoolean from "~/hooks/useBoolean";
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

export interface IAvatar {
  avatarUrl: string | null;
  color?: string;
  initial?: string;
  id?: string;
}

type Props = {
  /** The size of the avatar */
  size: AvatarSize;
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
};

function Avatar(props: Props) {
  const { model, style, ...rest } = props;
  const src = props.src || model?.avatarUrl;
  const [error, handleError] = useBoolean(false);

  return (
    <Relative style={style}>
      {src && !error ? (
        <CircleImg onError={handleError} src={src} {...rest} />
      ) : model ? (
        <Initials color={model.color} {...rest}>
          {model.initial}
        </Initials>
      ) : (
        <Initials {...rest} />
      )}
    </Relative>
  );
}

Avatar.defaultProps = {
  size: AvatarSize.Medium,
};

const Relative = styled.div`
  position: relative;
  user-select: none;
  flex-shrink: 0;
`;

const CircleImg = styled.img<{ size: number }>`
  display: block;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
`;

export default Avatar;
