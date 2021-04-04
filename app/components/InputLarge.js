// @flow
import styled from "styled-components";
import Input from "./Input";

const InputLarge = styled(Input)`
  height: 40px;
  flex-grow: 1;
  margin-right: 5px;
  input {
    height: 40px;
  }
`;

export default InputLarge;
