import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import useBoolean from "~/hooks/useBoolean";
import Initials from "./Initials";

export interface IAvatar {
  avatarUrl: string | null;
  color?: string;
  initial?: string;
  id?: string;
}

type Props = {
  size: number;
  src?: string;
  icon?: React.ReactNode;
  model?: IAvatar;
  alt?: string;
  showBorder?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  className?: string;
  style?: React.CSSProperties;
};

function Avatar(props: Props) {
  const { icon, showBorder, model, style, ...rest } = props;
  const src = props.src || model?.avatarUrl;
  const [error, handleError] = useBoolean(false);

  return (
    <Relative style={style}>
      {src && !error ? (
        <CircleImg
          onError={handleError}
          src={src}
          $showBorder={showBorder}
          {...rest}
        />
      ) : model ? (
        <Initials color={model.color} $showBorder={showBorder} {...rest}>
          {model.initial}
        </Initials>
      ) : (
        <Initials $showBorder={showBorder} {...rest} />
      )}
      {icon && <IconWrapper>{icon}</IconWrapper>}
    </Relative>
  );
}

Avatar.defaultProps = {
  size: 24,
};

const Relative = styled.div`
  position: relative;
  user-select: none;
  flex-shrink: 0;
`;

const IconWrapper = styled.div`
  display: flex;
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: ${s("accent")};
  border: 2px solid ${s("background")};
  border-radius: 100%;
  width: 20px;
  height: 20px;
`;

const CircleImg = styled.img<{ size: number; $showBorder?: boolean }>`
  display: block;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 50%;
  border: ${(props) =>
    props.$showBorder === false
      ? "none"
      : `2px solid ${props.theme.background}`};
  flex-shrink: 0;
  overflow: hidden;
`;

export default Avatar;
