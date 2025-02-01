import * as React from "react";
import styled from "styled-components";
import useBoolean from "~/hooks/useBoolean";
import Initials from "./Initials";

export enum AvatarSize {
  Small = 16,
  Toast = 18,
  Medium = 24,
  Large = 28,
  XLarge = 48,
  XXLarge = 64,
}

export interface IAvatar {
  avatarUrl: string | null;
  color?: string;
  initial?: string;
  id?: string;
}

type Props = {
  size: AvatarSize;
  src?: string;
  model?: IAvatar;
  alt?: string;
  showBorder?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  className?: string;
  style?: React.CSSProperties;
};

function Avatar(props: Props) {
  const { showBorder, model, style, ...rest } = props;
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
