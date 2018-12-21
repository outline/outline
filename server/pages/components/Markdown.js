// @flow
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

export default styled(ReactMarkdown)`
  blockquote {
    margin-left: 0;
    background-color: ${props => props.theme.smoke};
    border-left: 6px solid ${props => props.theme.smokeDark};
    padding: 15px 30px 15px 15px;
    font-style: italic;
    font-size: 16px;

    p {
      margin: 0;
    }
  }
`;
