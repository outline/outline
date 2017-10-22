// @flow
import React from 'react';
import { observer } from 'mobx-react';
import CenteredContent from 'components/CenteredContent';
import Editor from 'components/Editor';
import PageTitle from 'components/PageTitle';

type Props = {
  title: string,
  content: string,
};

const Flatpage = observer((props: Props) => {
  const { title, content } = props;

  return (
    <CenteredContent>
      <PageTitle title={title} />
      <Editor
        text={content}
        onChange={() => {}}
        onSave={() => {}}
        onCancel={() => {}}
        onImageUploadStart={() => {}}
        onImageUploadStop={() => {}}
        readOnly
      />
    </CenteredContent>
  );
});

export default Flatpage;
