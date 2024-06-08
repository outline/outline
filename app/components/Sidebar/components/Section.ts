import styled from "styled-components";
import Flex from "~/components/Flex";

const Section = styled(Flex)`
  position: relative;
  flex-direction: column;
  margin: 0 8px 12px;
  min-width: ${(props) => props.theme.sidebarMinWidth}px;
  flex-shrink: 0;

  &:first-child {
    margin-top: 12px;
  }

  &:empty {
    display: none;
  }
`;

export default Section;
