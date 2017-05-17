// @flow
import React from 'react';
import { observer } from 'mobx-react';

import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import { DocumentHtml } from 'components/Document';

import { convertToMarkdown } from 'utils/markdown';

type Props = {
  title: string,
  content: string,
};

@observer class Flatpage extends React.Component {
  props: Props;

  render() {
    const { title, content } = this.props;

    return (
      <Layout
        title={<Title content={title} />}
        titleText={title}
        search={false}
      >
        <CenteredContent>
          <DocumentHtml html={convertToMarkdown(content)} />
        </CenteredContent>
      </Layout>
    );
  }
}

export default Flatpage;
