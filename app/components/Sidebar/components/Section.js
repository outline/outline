// @flow
import styled from "styled-components";
import Flex from "components/Flex";

const Section = styled(Flex)`
  position: relative;
  flex-direction: column;
  margin: 0 8px 20px;
  min-width: ${(props) => props.theme.sidebarMinWidth}px;
  flex-shrink: 0;

  &:first-child {
    margin-top: 20px;
  }
`;

export default Section;
