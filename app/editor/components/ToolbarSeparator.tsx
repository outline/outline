import styled from "styled-components";

const Separator = styled.div`
  height: 24px;
  width: 2px;
  background: ${(props) => props.theme.toolbarItem};
  opacity: 0.3;
  display: inline-block;
  margin-left: 8px;
`;

export default Separator;
