import styled from "styled-components";

const ButtonLink = styled.button`
  margin: 0;
  padding: 0;
  border: 0;
  color: ${(props) => props.theme.link};
  line-height: inherit;
  background: none;
  text-decoration: none;
  cursor: pointer;
`;

export default ButtonLink;
