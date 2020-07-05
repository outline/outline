// @flow
import styled from "styled-components";
import { fadeIn } from "shared/styles/animations";

const Fade = styled.span`
  animation: ${fadeIn} ${props => props.timing || "250ms"} ease-in-out;
`;

export default Fade;
