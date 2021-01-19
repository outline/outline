// @flow
import styled from "styled-components";
import Flex from "components/Flex";

const Section = styled(Flex)`
  position: relative;
  flex-direction: column;
  margin: 24px 8px;
  min-width: ${(props) => props.theme.sidebarMinWidth};
`;

export default Section;
