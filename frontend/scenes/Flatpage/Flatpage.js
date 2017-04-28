import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';

import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import { DocumentHtml } from 'components/Document';

import { convertToMarkdown } from 'utils/markdown';

@observer class Flatpage extends React.Component {
  static propTypes = {
    route: PropTypes.object,
  };

  render() {
    const { title, content } = this.props.route;

    return (
      <Layout title={<Title>{title}</Title>} titleText={title} search={false}>
        <CenteredContent>
          <DocumentHtml html={convertToMarkdown(content)} />
        </CenteredContent>
      </Layout>
    );
  }
}

export default Flatpage;
