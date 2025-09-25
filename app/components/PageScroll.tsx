import * as React from "react";
import styled from "styled-components";
import useMediaQuery from "~/hooks/useMediaQuery";
import useMobile from "~/hooks/useMobile";
import ScrollContext from "./ScrollContext";

type Props = {
  children: React.ReactNode;
};

const StableWrapper = styled.div<{ $shouldApplyMobileStyles: boolean }>`
  ${({ $shouldApplyMobileStyles }) =>
    $shouldApplyMobileStyles
      ? `
        width: 100vw;
        height: 100vh;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      `
      : `
        display: contents;
      `}
`;

/**
 * A component that wraps its children in a scrollable container on mobile devices.
 * This allows us to place a fixed toolbar at the bottom of the page in the document
 * editor, which would otherwise be obscured by the on-screen keyboard.
 *
 * On desktop devices, the children are rendered directly without any wrapping.
 */
const PageScroll = ({ children }: Props) => {
  const isMobile = useMobile();
  const isPrinting = useMediaQuery("print");
  const ref = React.useRef<HTMLDivElement>(null);

  const shouldApplyMobileStyles = isMobile && !isPrinting;

  return (
    <ScrollContext.Provider value={shouldApplyMobileStyles ? ref : undefined}>
      <StableWrapper
        ref={ref}
        $shouldApplyMobileStyles={shouldApplyMobileStyles}
      >
        {children}
      </StableWrapper>
    </ScrollContext.Provider>
  );
};

export default PageScroll;
