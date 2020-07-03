// @flow
import styled from "styled-components";
import Button, { Inner } from "./Button";

const ButtonLarge = styled(Button)`
  height: auto;

  ${Inner} {
    padding: 8px 16px;
  }
`;

export default ButtonLarge;
