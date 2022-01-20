import styled from "styled-components";

const Input = styled.input`
  font-size: 15px;
  background: ${(props) => props.theme.toolbarInput};
  color: ${(props) => props.theme.toolbarItem};
  border-radius: 2px;
  padding: 3px 8px;
  border: 0;
  margin: 0;
  outline: none;
  flex-grow: 1;

  @media (hover: none) and (pointer: coarse) {
    font-size: 16px;
  }
`;

export default Input;
