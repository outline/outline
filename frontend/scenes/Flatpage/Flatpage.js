// @flow
import React from 'react';
import { observer } from 'mobx-react';
import CenteredContent from 'components/CenteredContent';
import { DocumentHtml } from 'components/Document';
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

    return (
      <CenteredContent>
        <PageTitle title={title} />
        <DocumentHtml html={convertToMarkdown(content)} />
      </CenteredContent>
    );
  }
}

export default Flatpage;
