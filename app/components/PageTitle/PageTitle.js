// @flow
import * as React from 'react';
import { Helmet } from 'react-helmet';

type Props = {
  title: string,
  favicon?: string,
};

const PageTitle = ({ title, favicon }: Props) => (
  <Helmet>
    <title>{`${title} - Outline`}</title>
    <link
      rel="shortcut icon"
      type="image/png"
      href={favicon || '/favicon-32.png'}
      sizes="32x32"
    />
  </Helmet>
);

export default PageTitle;
