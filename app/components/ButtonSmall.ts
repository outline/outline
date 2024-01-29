import styled from "styled-components";
import Button, { Inner } from "./Button";

const ButtonSmall = styled(Button)`
  font-size: 13px;
  height: 26px;

  ${Inner} {
    padding: 0 6px;
    line-height: 26px;
    min-height: 26px;
  }
`;

export default ButtonSmall;
