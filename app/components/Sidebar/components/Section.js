// @flow
import styled from "styled-components";
import Flex from "components/Flex";

const Section = styled(Flex)`
  position: relative;
  flex-direction: column;
  margin: 20px 8px;
  min-width: ${(props) => props.theme.sidebarMinWidth}px;
  flex-shrink: 0;
`;

export default Section;
