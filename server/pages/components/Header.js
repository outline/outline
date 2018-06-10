// @flow
import styled from 'styled-components';

const Header = styled.div`
  width: 100%;
  padding: 0 2em 2em;
  text-align: center;
  background: ${props => props.theme.slateLight};
  margin-bottom: 2em;

  p {
    max-width: 720px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.5em;
  }
`;

export default Header;
