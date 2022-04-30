import styled from "styled-components";

const TeamLogo = styled.img<{ width?: number; height?: number; size?: string }>`
  width: ${(props) =>
    props.width ? `${props.width}px` : props.size || "auto"};
  height: ${(props) =>
    props.height ? `${props.height}px` : props.size || "38px"};
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.divider};
  overflow: hidden;
  flex-shrink: 0;
`;

export default TeamLogo;
