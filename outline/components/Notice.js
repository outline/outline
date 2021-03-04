// @flow
import styled from "styled-components";

const Notice = styled.p`
  background: ${(props) => props.theme.sidebarBackground};
  color: ${(props) => props.theme.sidebarText};
  padding: 10px 12px;
  border-radius: 4px;
  position: relative;
`;

export default Notice;
