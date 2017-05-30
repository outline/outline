// @flow
import React from 'react';
import Helmet from 'react-helmet';

type Props = {
  title: string,
};

const PageTitle = ({ title }: Props) => <Helmet title={`${title} - Atlas`} />;

export default PageTitle;
