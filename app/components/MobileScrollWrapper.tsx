import * as React from "react";
import styled from "styled-components";
import useMobile from "~/hooks/useMobile";

type Props = {
  children: React.ReactNode;
};

const MobileWrapper = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
`;

const MobileScrollWrapper = ({ children }: Props) => {
  const isMobile = useMobile();
  return isMobile ? <MobileWrapper>{children}</MobileWrapper> : <>{children}</>;
};

export default MobileScrollWrapper;
