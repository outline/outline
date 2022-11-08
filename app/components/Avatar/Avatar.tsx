import * as React from "react";
import styled from "styled-components";
import User from "~/models/User";
import useBoolean from "~/hooks/useBoolean";
import Initials from "./Initials";
import placeholder from "./placeholder.png";

type Props = {
  size: number;
  src?: string;
  icon?: React.ReactNode;
  user?: User;
  alt?: string;
  showBorder?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  className?: string;
};

function Avatar(props: Props) {
  const { icon, showBorder, user, ...rest } = props;
  const src = props.src || user?.avatarUrl;

  const [error, handleError] = useBoolean(false);

  return (
    <Relative>
      {src ? (
        <CircleImg
          onError={handleError}
          src={error ? placeholder : src}
          $showBorder={showBorder}
          {...rest}
        />
      ) : user ? (
        <Initials color={user.color} $showBorder={showBorder} {...rest}>
          {user.initial}
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
