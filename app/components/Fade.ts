import styled from "styled-components";
import { fadeIn } from "~/styles/animations";

const Fade = styled.span<{ timing?: number | string }>`
  animation: ${fadeIn} ${(props) => props.timing || "250ms"} ease-in-out;
`;

export default Fade;
