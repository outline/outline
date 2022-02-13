import styled from "styled-components";

const Transition = styled.div<{ $expanded: boolean; $maxHeight: string }>`
  max-height: ${(props) => props.$maxHeight};
  transition: ${(props) =>
    props.$expanded ? "max-height 300ms ease-in" : "max-height 400ms ease-out"};
  overflow: hidden;
`;

export default Transition;
