import styled from "styled-components";
import { s } from "@shared/styles";

const Input = styled.input`
  font-size: 15px;
  background: ${s("inputBorder")};
  color: ${s("text")};
  border-radius: 2px;
  padding: 3px 8px;
  border: 0;
  margin: 0;
  outline: none;
  flex-grow: 1;
  min-width: 0;

  @media (hover: none) and (pointer: coarse) {
    font-size: 16px;
  }
`;

export default Input;
