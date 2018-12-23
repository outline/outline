// @flow
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

export default styled(ReactMarkdown)`
  blockquote {
    margin-left: 0;
    margin-right: 0;
    background-color: ${props => props.theme.smoke};
    border-left: 6px solid ${props => props.theme.smokeDark};
    padding: 15px 30px 15px 15px;
    font-style: italic;
    font-size: 16px;

    p {
      margin: 0;
    }
  }

  img {
    max-width: 100%;
    zoom: 50%;
    box-shadow: 0 10px 80px rgba(0, 0, 0, 0.1), 0 1px 10px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  }

  code {
    font-size: 15px;
    background: ${props => props.theme.smoke};
    padding: 2px 4px;
    border-radius: 2px;
  }
`;
