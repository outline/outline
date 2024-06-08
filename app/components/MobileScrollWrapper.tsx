import * as React from "react";
import styled from "styled-components";
import useMediaQuery from "~/hooks/useMediaQuery";
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
  const isPrinting = useMediaQuery("print");

  return isMobile && !isPrinting ? (
    <MobileWrapper>{children}</MobileWrapper>
  ) : (
    <>{children}</>
  );
};

export default MobileScrollWrapper;
