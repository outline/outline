import styled from "styled-components";

const Button = styled.button.attrs((props) => ({
  type: "type" in props ? props.type : "button",
}))<{
  width?: number;
  height?: number;
  size?: number;
}>`
  width: ${(props) => props.width || props.size || 24}px;
  height: ${(props) => props.height || props.size || 24}px;
  background: none;
  border-radius: 4px;
  display: inline-block;
  line-height: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  user-select: none;
  color: inherit;
`;

export default Button;
