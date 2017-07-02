// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

import { convertToMarkdown } from 'utils/markdown';

type Props = {
  title: string,
  content: string,
};

@observer class Flatpage extends React.Component {
  props: Props;

  render() {
    const { title, content } = this.props;
    const htmlContent = convertToMarkdown(content);

    return (
      <CenteredContent>
        <PageTitle title={title} />
        <HtmlContent dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </CenteredContent>
    );
  }
}

const HtmlContent = styled.div`
  h1, h2, h3, h4, h5, h6 {
    :global {
      .anchor {
        visibility: hidden;
        color: ;
      }
    }

    &:hover {
      :global {
        .anchor {
          visibility: visible;
        }
      }
    }
  }

  ul {
    padding-left: 1.5em;

    ul {
      margin: 0;
    }
  }

  // pre {
  //   box-shadow: 1px 1px 1px #f5f5f5;
  // }

  blockquote {
    font-style: italic;
    border-left: 2px solid $lightGray;
    padding-left: 0.8em;
  }

  table {
    width: 100%;
    overflow: auto;
    display: block;
    border-spacing: 0;
    border-collapse: collapse;

    thead, tbody {
      width: 100%;
    }

    thead {
      tr {
        border-bottom: 2px solid $lightGray;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid $lightGray;
      }
    }

    tr {
      background-color: #fff;

      // &:nth-child(2n) {
      //   background-color: #f8f8f8;
      // }
    }

    th, td {
      text-align: left;
      border: 1px 0 solid $lightGray;
      padding: 5px 20px 5px 0;

      &:last-child {
        padding-right: 0;
        width: 100%;
      }
    }

    th {
      font-weight: bold;
    }
  }
`;

export default Flatpage;
