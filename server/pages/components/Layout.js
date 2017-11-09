// @flow
import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from './Navigation';
import Analytics from '../../../shared/components/Analytics';
import globalStyles from '../../../shared/styles/globals';

type Props = {
  children?: React$Element<*>,
};

export default function Layout({ children }: Props) {
  globalStyles();

  return (
    <html lang="en">
      <head>
        <Helmet>
          <title>Outline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Helmet>
        <Analytics />

        {'{{HEAD}}'}
        {'{{CSS}}'}
      </head>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
