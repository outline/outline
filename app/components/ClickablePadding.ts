import styled from "styled-components";

const ClickablePadding = styled.div<{
  grow?: boolean;
  minHeight?: React.CSSProperties["paddingBottom"];
}>`
  min-height: ${(props) => props.minHeight || "50vh"};
  flex-grow: 100;
  cursor: text;
`;

export default ClickablePadding;
