// @flow
import React from 'react';
import { observer } from 'mobx-react';
import CenteredContent from 'components/CenteredContent';
import HtmlContent from 'components/HtmlContent';
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

export default Flatpage;
