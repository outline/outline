// @flow
import styled from "styled-components";

const Notice = styled.p`
  background: ${props =>
    props.muted ? props.theme.sidebarBackground : props.theme.yellow};
  color: ${props =>
    props.muted ? props.theme.sidebarText : "hsla(46, 100%, 20%, 1)"};
  padding: 10px 12px;
  border-radius: 4px;
`;

export default Notice;
