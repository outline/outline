import * as React from "react";
import styled from "styled-components";
import User from "~/models/User";
import useBoolean from "~/hooks/useBoolean";
import placeholder from "./placeholder.png";

type Props = {
  src: string;
  size: number;
  icon?: React.ReactNode;
  user?: User;
  alt?: string;
  showBorder?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  className?: string;
};

function Avatar(props: Props) {
  const { src, icon, showBorder, ...rest } = props;

  const [error, handleError] = useBoolean(false);

  return (
    <AvatarWrapper>
      <CircleImg
        onError={handleError}
        src={error ? placeholder : src}
        $showBorder={showBorder}
        {...rest}
      />
      {icon && <IconWrapper>{icon}</IconWrapper>}
    </AvatarWrapper>
  );
}

Avatar.defaultProps = {
  size: 24,
};

const AvatarWrapper = styled.div`
  position: relative;
`;

const IconWrapper = styled.div`
  display: flex;
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: ${(props) => props.theme.primary};
  border: 2px solid ${(props) => props.theme.background};
  border-radius: 100%;
  width: 20px;
  height: 20px;
`;

const CircleImg = styled.img<{ size: number; $showBorder?: boolean }>`
  display: block;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: 50%;
  border: 2px solid
    ${(props) =>
      props.$showBorder === false ? "transparent" : props.theme.background};
  flex-shrink: 0;
`;

export default Avatar;
