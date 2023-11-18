import styled from "styled-components";

type Props = {
  /** Set to true if displaying a single symbol character to disable monospace */
  symbol?: boolean;
};

const Key = styled.kbd<Props>`
  display: inline-block;
  padding: 4px 6px;
  font-size: 11px;
  font-family: ${(props) =>
    props.symbol ? props.theme.fontFamily : props.theme.fontFamilyMono};
  line-height: 10px;
  color: ${(props) => props.theme.almostBlack};
  vertical-align: middle;
  background-color: ${(props) => props.theme.smokeLight};
  border: solid 1px ${(props) => props.theme.slateLight};
  border-bottom-color: ${(props) => props.theme.slate};
  border-radius: 3px;
`;

export default Key;
